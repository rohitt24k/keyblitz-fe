import { MongoClient } from "mongodb";
import { raceResultsCollection } from "./models";
import { getPassage } from "./words";
import type {
  ClientMessage,
  Env,
  FinalResult,
  LeaderboardEntry,
  PlayerSnapshot,
  RaceStatus,
  ServerMessage,
} from "./types";

interface Player {
  playerId: string;
  username: string;
  socket: WebSocket;
  isConnected: boolean;
  wordIndex: number;
  letterIndex: number;
  wpm: number;
  finishedAt: number | null;
}

const TOP_N = 5;
const LEADERBOARD_INTERVAL_MS = 300;

export class RoomObject implements DurableObject {
  private players = new Map<string, Player>();
  private socketToPlayer = new Map<WebSocket, string>();

  private status: RaceStatus = "lobby";
  private creatorId: string | null = null;
  private words: string[] = [];
  private startTime: number | null = null;
  private endTime: number | null = null;
  private roomCode: string | null = null;
  private leaderboardTimer: ReturnType<typeof setInterval> | null = null;
  // Stored so a reconnecting player can receive results after the race ends
  private finalResults: FinalResult[] | null = null;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (!this.roomCode) {
      const url = new URL(request.url);
      const match = url.pathname.match(/\/([^/]+)$/);
      if (match) this.roomCode = match[1];
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    server.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ClientMessage;
        this.handleMessage(server, msg);
      } catch {
        // Ignore malformed messages
      }
    });

    server.addEventListener("close", () => this.handleClose(server));
    server.addEventListener("error", () => this.handleClose(server));

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleMessage(socket: WebSocket, msg: ClientMessage): void {
    switch (msg.type) {
      case "join":
        this.handleJoin(socket, msg.playerId, msg.username);
        break;
      case "start":
        this.handleStart(socket);
        break;
      case "progress":
        this.handleProgress(socket, msg.wordIndex, msg.letterIndex);
        break;
    }
  }

  private handleJoin(
    socket: WebSocket,
    playerId: string,
    username: string,
  ): void {
    const existing = this.players.get(playerId);

    if (existing) {
      // Reconnect — restore socket and mark online, all progress is preserved
      this.socketToPlayer.delete(existing.socket);
      existing.socket = socket;
      existing.isConnected = true;

      // Resume leaderboard tick if it was stopped (e.g. all went idle)
      if (this.status === "racing" && this.leaderboardTimer === null) {
        this.startLeaderboardTick();
      }
    } else {
      if (this.creatorId === null) this.creatorId = playerId;
      this.players.set(playerId, {
        playerId,
        username,
        socket,
        isConnected: true,
        wordIndex: 0,
        letterIndex: 0,
        wpm: 0,
        finishedAt: null,
      });
    }

    this.socketToPlayer.set(socket, playerId);

    // Send full room state to the joining/reconnecting player
    this.send(socket, {
      type: "status",
      status: this.status,
      players: this.snapshots(),
      creatorId: this.creatorId,
      ...(this.status === "racing" ? { words: this.words } : {}),
    });

    // If the race already finished, replay the results to the reconnecting player
    if (this.status === "finished" && this.finalResults) {
      this.send(socket, { type: "finished", results: this.finalResults });
    }

    // Notify all other connected players of the updated player list
    this.broadcastExcept(socket, {
      type: "status",
      status: this.status,
      players: this.snapshots(),
      creatorId: this.creatorId,
    });
  }

  private handleStart(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    if (playerId !== this.creatorId) {
      this.send(socket, {
        type: "error",
        message: "Only the host can start the race.",
      });
      return;
    }
    if (this.status !== "lobby") {
      this.send(socket, { type: "error", message: "Race already started." });
      return;
    }

    this.words = getPassage(50);
    this.status = "countdown";

    this.broadcast({
      type: "status",
      status: "countdown",
      players: this.snapshots(),
      creatorId: this.creatorId,
    });

    // Transition to racing after 5 s
    setTimeout(() => {
      this.status = "racing";
      this.startTime = Date.now();
      this.broadcast({
        type: "status",
        status: "racing",
        players: this.snapshots(),
        creatorId: this.creatorId,
        words: this.words,
      });
      this.startLeaderboardTick();
    }, 5000);
  }

  private handleProgress(
    socket: WebSocket,
    wordIndex: number,
    letterIndex: number,
  ): void {
    if (this.status !== "racing" || this.startTime === null) return;

    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;
    const player = this.players.get(playerId);
    if (!player || player.finishedAt !== null) return;

    // Reject backwards movement — also acts as the catch-up guard after reconnect
    const isAhead =
      wordIndex > player.wordIndex ||
      (wordIndex === player.wordIndex && letterIndex > player.letterIndex);
    if (!isAhead) return;

    if (wordIndex > this.words.length) return;

    player.wordIndex = wordIndex;
    player.letterIndex = letterIndex;

    const charIndex = this.charCount(wordIndex, letterIndex);
    const elapsedMs = Date.now() - this.startTime;
    if (charIndex > 0 && elapsedMs > 0) {
      player.wpm = Math.round((charIndex / 5) / (elapsedMs / 60000));
    }

    if (wordIndex >= this.words.length && player.finishedAt === null) {
      player.finishedAt = Date.now();
      this.checkRaceFinished();
    }
  }

  private charCount(wordIndex: number, letterIndex: number): number {
    const completed = this.words
      .slice(0, wordIndex)
      .reduce((sum, w) => sum + w.length + 1, 0);
    const maxLen = this.words.join(" ").length;
    return Math.min(completed + letterIndex, maxLen);
  }

  private checkRaceFinished(): void {
    // Race ends when every player has either finished or disconnected permanently
    const allDone = Array.from(this.players.values()).every(
      (p) => p.finishedAt !== null || !p.isConnected,
    );
    if (!allDone) return;

    this.status = "finished";
    this.endTime = Date.now();
    this.stopLeaderboardTick();
    this.broadcastFinished();
  }

  private broadcastFinished(): void {
    const finished = Array.from(this.players.values())
      .filter((p) => p.finishedAt !== null)
      .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));

    const results: FinalResult[] = finished.map((p, i) => ({
      playerId: p.playerId,
      username: p.username,
      wpm: p.wpm,
      accuracy: 100, // placeholder — full char validation in a later phase
      rank: i + 1,
      finishedAt: p.finishedAt,
    }));

    // Cache results so reconnecting players can receive them
    this.finalResults = results;

    // Broadcast first — Mongo write must not block clients receiving results
    this.broadcast({ type: "finished", results });

    this.state.waitUntil(
      this.persistResults(results).catch((err) =>
        console.error("[RoomObject] MongoDB write failed:", err),
      ),
    );
  }

  private async persistResults(results: FinalResult[]): Promise<void> {
    const uri = this.env.MONGODB_URI;
    if (!uri) {
      console.warn("[RoomObject] MONGODB_URI not set — skipping persistence");
      return;
    }

    const client = new MongoClient(uri);
    try {
      await client.connect();
      await raceResultsCollection(client).insertOne({
        roomCode: this.roomCode,
        textPassage: this.words.join(" "),
        startedAt: this.startTime ? new Date(this.startTime) : new Date(),
        endedAt: new Date(this.endTime ?? Date.now()),
        players: results.map((r) => ({
          playerId: r.playerId,
          username: r.username,
          wpm: r.wpm,
          accuracy: r.accuracy / 100,
          rank: r.rank,
          finishedAt: r.finishedAt ? new Date(r.finishedAt) : null,
        })),
      });
      console.log(`[RoomObject] Persisted results for room ${this.roomCode}`);
    } finally {
      await client.close();
    }
  }

  private startLeaderboardTick(): void {
    if (this.leaderboardTimer !== null) return;
    this.leaderboardTimer = setInterval(
      () => this.broadcastLeaderboard(),
      LEADERBOARD_INTERVAL_MS,
    );
  }

  private stopLeaderboardTick(): void {
    if (this.leaderboardTimer !== null) {
      clearInterval(this.leaderboardTimer);
      this.leaderboardTimer = null;
    }
  }

  private broadcastLeaderboard(): void {
    const connected = Array.from(this.players.values()).filter(
      (p) => p.isConnected,
    );
    if (connected.length === 0) return;

    const ranked = [...this.players.values()].sort((a, b) => {
      if (b.wordIndex !== a.wordIndex) return b.wordIndex - a.wordIndex;
      return b.letterIndex - a.letterIndex;
    });
    const topN = ranked.slice(0, TOP_N);

    for (const player of connected) {
      const inTopN = topN.some((p) => p.playerId === player.playerId);
      const entries = inTopN ? topN : [...topN, player];

      const leaderboard: LeaderboardEntry[] = entries.map((p) => ({
        playerId: p.playerId,
        username: p.username,
        wordIndex: p.wordIndex,
        letterIndex: p.letterIndex,
        wpm: p.wpm,
        isFinished: p.finishedAt !== null,
      }));

      this.send(player.socket, { type: "leaderboard", players: leaderboard });
    }
  }

  private handleClose(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    this.socketToPlayer.delete(socket);
    const player = this.players.get(playerId);
    if (!player) return;

    if (this.status === "lobby") {
      // In the lobby: fully remove the player
      this.players.delete(playerId);

      if (playerId === this.creatorId) {
        const next = Array.from(this.players.values()).find((p) => p.isConnected);
        this.creatorId = next ? next.playerId : null;
      }

      if (this.players.size > 0) {
        this.broadcast({
          type: "status",
          status: this.status,
          players: this.snapshots(),
          creatorId: this.creatorId,
        });
      }
    } else {
      // During a race: keep the slot alive for reconnect, just mark offline
      player.isConnected = false;

      if (playerId === this.creatorId) {
        const next = Array.from(this.players.values()).find((p) => p.isConnected);
        this.creatorId = next ? next.playerId : null;
      }

      // Disconnecting mid-race may unblock checkRaceFinished if others are done
      if (this.status === "racing") this.checkRaceFinished();
    }
  }

  // Returns only connected players — used for the lobby list
  private snapshots(): PlayerSnapshot[] {
    return Array.from(this.players.values())
      .filter((p) => p.isConnected)
      .map((p) => ({
        playerId: p.playerId,
        username: p.username,
        isCreator: p.playerId === this.creatorId,
      }));
  }

  private send(socket: WebSocket, msg: ServerMessage): void {
    try {
      socket.send(JSON.stringify(msg));
    } catch {
      // Socket already closed
    }
  }

  // Send to all connected players
  private broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const player of this.players.values()) {
      if (!player.isConnected) continue;
      try {
        player.socket.send(data);
      } catch {
        // Skip closed sockets
      }
    }
  }

  // Send to all connected players except one (used after a join to avoid echo)
  private broadcastExcept(exclude: WebSocket, msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const player of this.players.values()) {
      if (!player.isConnected || player.socket === exclude) continue;
      try {
        player.socket.send(data);
      } catch {
        // Skip closed sockets
      }
    }
  }
}
