import { MongoClient, type Collection, type Document } from "mongodb";

// ── Document shape ────────────────────────────────────────────────────────────

interface PlayerResult {
  playerId: string;
  username: string;
  wpm: number;
  accuracy: number; // stored as ratio 0–1 (e.g. 0.96)
  rank: number;
  finishedAt: Date | null;
}

export interface RaceResultDocument extends Document {
  roomCode: string | null;
  textPassage: string;
  startedAt: Date;
  endedAt: Date;
  players: PlayerResult[];
}

// ── Collection accessor ───────────────────────────────────────────────────────

const RACE_RESULTS = "race_results";

/**
 * Returns a typed collection handle from an already-connected MongoClient.
 * The database is taken from the connection string (no need to hard-code it).
 */
export function raceResultsCollection(
  client: MongoClient,
): Collection<RaceResultDocument> {
  return client.db().collection<RaceResultDocument>(RACE_RESULTS);
}
