import type {
  ClientMessage,
  ServerMessage,
  RaceStatus,
  PlayerSnapshot,
} from "./types";

interface Player {
  playerId: string;
  username: string;
  socket: WebSocket;
  // Added in Phase 2
  charIndex: number;
  totalCharsTyped: number;
  correctCharsTyped: number;
  finishedAt: number | null;
}

// Short passages used until Phase 2 wires the word lists
const PASSAGES = [
  "the quick brown fox jumps over the lazy dog and then sat down to rest in the shade of a large oak tree waiting for the sun to set",
  "to be or not to be that is the question whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune or to take arms against a sea of troubles",
  "all the world is a stage and all the men and women merely players they have their exits and their entrances and one man in his time plays many parts",
  "it was the best of times it was the worst of times it was the age of wisdom it was the age of foolishness it was the epoch of belief it was the epoch of incredulity",
  "two roads diverged in a yellow wood and sorry i could not travel both and be one traveler long i stood and looked down one as far as i could to where it bent in the undergrowth",
];

function randomPassage(): string {
  return PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
}

export class RoomObject implements DurableObject {
  // playerId → Player
  private players = new Map<string, Player>();
  // socket → playerId (for quick lookup on close/message)
  private socketToPlayer = new Map<WebSocket, string>();

  private status: RaceStatus = "lobby";
  private creatorId: string | null = null;
  private text = "";
  private startTime: number | null = null;

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
        // Implemented in Phase 2
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
      // Reconnect — replace socket
      this.socketToPlayer.delete(existing.socket);
      existing.socket = socket;
    } else {
      if (this.creatorId === null) {
        this.creatorId = playerId;
      }
      this.players.set(playerId, {
        playerId,
        username,
        socket,
        charIndex: 0,
        totalCharsTyped: 0,
        correctCharsTyped: 0,
        finishedAt: null,
      });
    }

    this.socketToPlayer.set(socket, playerId);

    // Send current room state to the joining player
    const stateMsg: ServerMessage = {
      type: "status",
      status: this.status,
      players: this.snapshots(),
      creatorId: this.creatorId,
      ...(this.status === "racing" ? { text: this.text } : {}),
    };
    this.send(socket, stateMsg);

    // Notify everyone of the updated player list
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

    this.text = randomPassage();
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
        text: this.text,
      });
    }, 5000);
  }

  private handleClose(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    this.socketToPlayer.delete(socket);
    this.players.delete(playerId);

    // Reassign host if they left
    if (playerId === this.creatorId) {
      const next = this.players.values().next().value;
      this.creatorId = next ? next.playerId : null;
    }

    // Only update lobby; mid-race departures are handled silently for now
    if (this.status === "lobby" && this.players.size > 0) {
      this.broadcast({
        type: "status",
        status: this.status,
        players: this.snapshots(),
        creatorId: this.creatorId,
      });
    }
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
      // Socket may already be closed
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
