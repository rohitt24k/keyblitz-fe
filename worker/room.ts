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
  isConnected: boolean;
  wordIndex: number;
  letterIndex: number;
  wpm: number;
  finishedAt: number | null;
}

// Serialisable room state written to DO storage on every key transition.
// Sockets are NOT included — they're rebuilt from state.getWebSockets() on wake.
interface PersistedState {
  status: RaceStatus;
  creatorId: string | null;
  words: string[];
  startTime: number | null;
  endTime: number | null;
  roomCode: string | null;
  players: Player[];
  finalResults: FinalResult[] | null;
}

const STORAGE_KEY = "s";
const TOP_N = 5;
const LEADERBOARD_INTERVAL_MS = 300;
const ROOM_TTL_MS = 10 * 60 * 1000; // 10 minutes

export class RoomObject implements DurableObject {
  // In-memory socket lookup — rebuilt from live hibernated sockets on wake
  private sockets = new Map<string, WebSocket>(); // playerId → WebSocket

  private players = new Map<string, Player>();
  private status: RaceStatus = "lobby";
  private creatorId: string | null = null;
  private words: string[] = [];
  private startTime: number | null = null;
  private endTime: number | null = null;
  private roomCode: string | null = null;
  private finalResults: FinalResult[] | null = null;

  private leaderboardTimer: ReturnType<typeof setInterval> | null = null;
  private booted = false;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  // ─── HTTP / WebSocket upgrade ──────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    await this.boot();

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

    // Hibernation API: acceptWebSocket keeps sockets alive across DO hibernation
    this.state.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  // ─── DO lifecycle methods (replace addEventListener) ───────────────────────

  async webSocketMessage(
    ws: WebSocket,
    data: string | ArrayBuffer,
  ): Promise<void> {
    await this.boot();
    try {
      const msg = JSON.parse(data as string) as ClientMessage;
      this.handleMessage(ws, msg);
    } catch {
      // Ignore malformed messages
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.boot();
    this.handleClose(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.boot();
    this.handleClose(ws);
  }

  async alarm(): Promise<void> {
    await this.boot();

    if (this.status === "countdown") {
      // Countdown timer fired — transition to racing
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
      await this.persist();
    } else {
      // TTL cleanup — race finished (or abandoned lobby), evict the room
      for (const ws of this.state.getWebSockets()) {
        try {
          ws.close(1001, "Room expired");
        } catch {
          /* already gone */
        }
      }
      await this.state.storage.deleteAll();
    }
  }

  // ─── State boot / persist ──────────────────────────────────────────────────

  private async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;

    const saved = await this.state.storage.get<PersistedState>(STORAGE_KEY);
    if (saved) {
      this.status = saved.status;
      this.creatorId = saved.creatorId;
      this.words = saved.words;
      this.startTime = saved.startTime;
      this.endTime = saved.endTime;
      this.roomCode = saved.roomCode;
      this.finalResults = saved.finalResults;

      for (const p of saved.players) {
        // Mark all as disconnected until we re-attach live sockets below
        this.players.set(p.playerId, { ...p, isConnected: false });
      }

      // Re-attach live hibernated sockets using the attachment written at join time
      for (const ws of this.state.getWebSockets()) {
        const attachment = ws.deserializeAttachment() as {
          playerId: string;
        } | null;
        if (!attachment) continue;
        const { playerId } = attachment;
        const player = this.players.get(playerId);
        if (player) {
          player.isConnected = true;
          this.sockets.set(playerId, ws);
        }
      }

      // Restart leaderboard tick if a race was in flight when the DO woke up
      if (this.status === "racing") {
        this.startLeaderboardTick();
      }
    }
  }

  private async persist(): Promise<void> {
    const data: PersistedState = {
      status: this.status,
      creatorId: this.creatorId,
      words: this.words,
      startTime: this.startTime,
      endTime: this.endTime,
      roomCode: this.roomCode,
      finalResults: this.finalResults,
      players: Array.from(this.players.values()),
    };
    await this.state.storage.put(STORAGE_KEY, data);
  }

  // ─── Message dispatch ──────────────────────────────────────────────────────

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

  // ─── Join / reconnect ──────────────────────────────────────────────────────

  private handleJoin(
    socket: WebSocket,
    playerId: string,
    username: string,
  ): void {
    // Bind this playerId to the socket so we can recover it after hibernation
    socket.serializeAttachment({ playerId });

    const existing = this.players.get(playerId);

    if (existing) {
      // Reconnect — restore socket and mark online, all progress is preserved
      const oldWs = this.sockets.get(playerId);
      if (oldWs && oldWs !== socket) {
        // Close the old hibernated socket cleanly
        try {
          oldWs.close(1000, "Replaced by reconnect");
        } catch {
          /* already gone */
        }
      }
      existing.isConnected = true;
      this.sockets.set(playerId, socket);

      // Resume leaderboard tick if it was stopped (e.g. all went idle)
      if (this.status === "racing" && this.leaderboardTimer === null) {
        this.startLeaderboardTick();
      }
    } else {
      if (this.creatorId === null) this.creatorId = playerId;
      this.players.set(playerId, {
        playerId,
        username,
        isConnected: true,
        wordIndex: 0,
        letterIndex: 0,
        wpm: 0,
        finishedAt: null,
      });
      this.sockets.set(playerId, socket);
    }

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

    this.state.waitUntil(this.persist());
  }

  // ─── Start race ────────────────────────────────────────────────────────────

  private handleStart(socket: WebSocket): void {
    const playerId = this.playerIdFromSocket(socket);
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

    // Use an alarm instead of setTimeout — survives DO hibernation
    this.state.waitUntil(
      this.persist().then(() => this.state.storage.setAlarm(Date.now() + 5000)),
    );
  }

  // ─── Progress ─────────────────────────────────────────────────────────────

  private handleProgress(
    socket: WebSocket,
    wordIndex: number,
    letterIndex: number,
  ): void {
    if (this.status !== "racing" || this.startTime === null) return;

    const playerId = this.playerIdFromSocket(socket);
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
      player.wpm = Math.round(charIndex / 5 / (elapsedMs / 60000));
    }

    if (wordIndex >= this.words.length && player.finishedAt === null) {
      player.finishedAt = Date.now();
      this.checkRaceFinished();
    }
  }

  // ─── Race finish ───────────────────────────────────────────────────────────

  private charCount(wordIndex: number, letterIndex: number): number {
    const completed = this.words
      .slice(0, wordIndex)
      .reduce((sum, w) => sum + w.length + 1, 0);
    const maxLen = this.words.join(" ").length;
    return Math.min(completed + letterIndex, maxLen);
  }

  private checkRaceFinished(): void {
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
      accuracy: 100,
      rank: i + 1,
      finishedAt: p.finishedAt,
    }));

    this.finalResults = results;

    // Broadcast first — Mongo write must not block clients receiving results
    this.broadcast({ type: "finished", results });

    // Persist finished state + schedule room TTL cleanup alarm
    this.state.waitUntil(
      this.persist()
        .then(() => this.state.storage.setAlarm(Date.now() + ROOM_TTL_MS))
        .then(() => this.persistResults(results))
        .catch((err) =>
          console.error("[RoomObject] Post-finish tasks failed:", err),
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

  // ─── Leaderboard tick ─────────────────────────────────────────────────────

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
    if (connected.length === 0) {
      // No one online — stop ticking to allow hibernation
      this.stopLeaderboardTick();
      return;
    }

    const ranked = [...this.players.values()].sort((a, b) => {
      if (b.wordIndex !== a.wordIndex) return b.wordIndex - a.wordIndex;
      return b.letterIndex - a.letterIndex;
    });
    const topN = ranked.slice(0, TOP_N);

    for (const player of connected) {
      const ws = this.sockets.get(player.playerId);
      if (!ws) continue;

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

      this.send(ws, { type: "leaderboard", players: leaderboard });
    }
  }

  // ─── Disconnect handling ───────────────────────────────────────────────────

  private handleClose(socket: WebSocket): void {
    const attachment = socket.deserializeAttachment() as {
      playerId: string;
    } | null;
    if (!attachment) return;
    const { playerId } = attachment;

    this.sockets.delete(playerId);
    const player = this.players.get(playerId);
    if (!player) return;

    if (this.status === "lobby") {
      // In the lobby: fully remove the player
      this.players.delete(playerId);

      if (playerId === this.creatorId) {
        const next = Array.from(this.players.values()).find(
          (p) => p.isConnected,
        );
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
        const next = Array.from(this.players.values()).find(
          (p) => p.isConnected,
        );
        this.creatorId = next ? next.playerId : null;
      }

      // Disconnecting mid-race may unblock checkRaceFinished if others are done
      if (this.status === "racing") this.checkRaceFinished();
    }

    this.state.waitUntil(this.persist());
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private playerIdFromSocket(socket: WebSocket): string | undefined {
    const attachment = socket.deserializeAttachment() as {
      playerId: string;
    } | null;
    return attachment?.playerId;
  }

  // Returns only connected players — used for lobby list
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
      const ws = this.sockets.get(player.playerId);
      if (!ws) continue;
      try {
        ws.send(data);
      } catch {
        // Skip closed sockets
      }
    }
  }

  // Send to all connected players except one (used after a join to avoid echo)
  private broadcastExcept(exclude: WebSocket, msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const player of this.players.values()) {
      if (!player.isConnected) continue;
      const ws = this.sockets.get(player.playerId);
      if (!ws || ws === exclude) continue;
      try {
        ws.send(data);
      } catch {
        // Skip closed sockets
      }
    }
  }
}
