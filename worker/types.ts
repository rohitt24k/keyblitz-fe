export interface Env {
  ROOM: DurableObjectNamespace;
  MONGODB_URI: string;
}

export type RaceStatus = "lobby" | "countdown" | "racing" | "finished";

export interface PlayerSnapshot {
  playerId: string;
  username: string;
  isCreator: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  wordIndex: number;
  letterIndex: number;
  wpm: number;
  isFinished: boolean;
}

export interface FinalResult {
  playerId: string;
  username: string;
  wpm: number;
  accuracy: number; // placeholder — full char validation comes in a later phase
  rank: number;
  finishedAt: number | null;
}

// Client → Server
export type ClientMessage =
  | { type: "join"; playerId: string; username: string }
  | { type: "start" }
  | { type: "progress"; wordIndex: number; letterIndex: number };

// Server → Client
export type ServerMessage =
  | {
      type: "status";
      status: RaceStatus;
      players: PlayerSnapshot[];
      creatorId: string | null;
      words?: string[]; // sent when status transitions to "racing"
    }
  | { type: "leaderboard"; players: LeaderboardEntry[] }
  | { type: "finished"; results: FinalResult[] }
  | { type: "error"; message: string };
