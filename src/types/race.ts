// These mirror worker/types.ts exactly — keep in sync when adding new message types.

export type RaceStatus = "lobby" | "countdown" | "racing" | "finished";

export interface PlayerSnapshot {
  playerId: string;
  username: string;
  isCreator: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  charIndex: number;
  wpm: number;
  isFinished: boolean;
}

export interface FinalResult {
  playerId: string;
  username: string;
  wpm: number;
  accuracy: number;
  rank: number;
  finishedAt: number | null;
}

// Client → Server
export type ClientMessage =
  | { type: "join"; playerId: string; username: string }
  | { type: "start" }
  | { type: "progress"; charIndex: number };

// Server → Client
export type ServerMessage =
  | {
      type: "status";
      status: RaceStatus;
      players: PlayerSnapshot[];
      creatorId: string | null;
      text?: string;
    }
  | { type: "leaderboard"; players: LeaderboardEntry[] }
  | { type: "finished"; results: FinalResult[] }
  | { type: "error"; message: string };
