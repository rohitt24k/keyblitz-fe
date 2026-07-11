import type {
  ClientMessage,
  ServerMessage,
  RaceStatus,
  PlayerSnapshot,
  LeaderboardEntry,
  FinalResult,
} from "./types";

interface Player {
  playerId: string;
  username: string;
  socket: WebSocket;
  wordIndex: number;
  letterIndex: number;
  wpm: number;
  finishedAt: number | null;
}

const PASSAGES = [
  "the quick brown fox jumps over the lazy dog and then sat down to rest in the shade of a large oak tree waiting for the sun to set",
  "to be or not to be that is the question whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune or to take arms against a sea of troubles",
  "all the world is a stage and all the men and women merely players they have their exits and their entrances and one man in his time plays many parts",
  "it was the best of times it was the worst of times it was the age of wisdom it was the age of foolishness it was the epoch of belief it was the epoch of incredulity",
  "two roads diverged in a yellow wood and sorry i could not travel both and be one traveler long i stood and looked down one as far as i could to where it bent in the undergrowth",
];

const TOP_N = 5;
const LEADERBOARD_INTERVAL_MS = 300;

export class RoomObject implements DurableObject {
  private players = new Map<string, Player>();
  private socketToPlayer = new Map<WebSocket, string>();

  private status: RaceStatus = "lobby";
  private creatorId: string | null = null;
  private words: string[] = [];
  private startTime: number | null = null;
  private leaderboardTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: object,
  ) {}

  async fetch(request: Request): Promise<Response> {
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
      // Reconnect — replace socket, preserve progress
      this.socketToPlayer.delete(existing.socket);
      existing.socket = socket;
    } else {
      if (this.creatorId === null) this.creatorId = playerId;
      this.players.set(playerId, {
        playerId,
        username,
        socket,
        wordIndex: 0,
        letterIndex: 0,
        wpm: 0,
        finishedAt: null,
      });
    }

    this.socketToPlayer.set(socket, playerId);

    // Send full room state to the joining player
    this.send(socket, {
      type: "status",
      status: this.status,
      players: this.snapshots(),
      creatorId: this.creatorId,
      ...(this.status === "racing" ? { words: this.words } : {}),
    });

    // Notify all other players of the updated list
    this.broadcast({
      type: "status",
      status: this.status,
      players: this.snapshots(),
      creatorId: this.creatorId,
    });
  }

  private handleStart(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    if (playerId !== this.creatorId) {
      this.send(socket, { type: "error", message: "Only the host can start the race." });
      return;
    }
    if (this.status !== "lobby") {
      this.send(socket, { type: "error", message: "Race already started." });
      return;
    }

    const passage = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
    this.words = passage.split(" ");
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

    // Reject backwards movement
    const isAhead =
      wordIndex > player.wordIndex ||
      (wordIndex === player.wordIndex && letterIndex > player.letterIndex);
    if (!isAhead) return;

    // Reject out-of-bounds (can't jump past the end)
    if (wordIndex > this.words.length) return;

    player.wordIndex = wordIndex;
    player.letterIndex = letterIndex;

    // Compute WPM from absolute char position
    const charIndex = this.charCount(wordIndex, letterIndex);
    const elapsedMs = Date.now() - this.startTime;
    if (charIndex > 0 && elapsedMs > 0) {
      player.wpm = Math.round((charIndex / 5) / (elapsedMs / 60000));
    }

    // Player finished when cursor moves past the last word
    if (wordIndex >= this.words.length && player.finishedAt === null) {
      player.finishedAt = Date.now();
      this.checkRaceFinished();
    }
  }

  /** Absolute character position in the passage, for WPM calculation only. */
  private charCount(wordIndex: number, letterIndex: number): number {
    const completed = this.words
      .slice(0, wordIndex)
      .reduce((sum, w) => sum + w.length + 1, 0); // +1 for the space after each word
    const maxLen = this.words.join(" ").length;
    return Math.min(completed + letterIndex, maxLen);
  }

  private checkRaceFinished(): void {
    const allDone = Array.from(this.players.values()).every(
      (p) => p.finishedAt !== null,
    );
    if (!allDone) return;

    this.status = "finished";
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
      accuracy: 100, // TODO Phase 5+: track correct chars per keystroke
      rank: i + 1,
      finishedAt: p.finishedAt,
    }));

    this.broadcast({ type: "finished", results });
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
    if (this.players.size === 0) return;

    const ranked = Array.from(this.players.values()).sort((a, b) => {
      if (b.wordIndex !== a.wordIndex) return b.wordIndex - a.wordIndex;
      return b.letterIndex - a.letterIndex;
    });
    const topN = ranked.slice(0, TOP_N);

    for (const player of this.players.values()) {
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
    this.players.delete(playerId);

    if (playerId === this.creatorId) {
      const next = this.players.values().next().value;
      this.creatorId = next ? next.playerId : null;
    }

    if (this.status === "lobby" && this.players.size > 0) {
      this.broadcast({
        type: "status",
        status: this.status,
        players: this.snapshots(),
        creatorId: this.creatorId,
      });
    }

    // If someone disconnected mid-race and everyone else is done, wrap up
    if (this.status === "racing") this.checkRaceFinished();
  }

  private snapshots(): PlayerSnapshot[] {
    return Array.from(this.players.values()).map((p) => ({
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

  private broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const player of this.players.values()) {
      try {
        player.socket.send(data);
      } catch {
        // Skip closed sockets
      }
    }
  }
}
