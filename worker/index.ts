import { RoomObject } from "./room";
import type { Env } from "./types";

export { RoomObject };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function generateRoomCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

const main = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // POST /api/room/create — generate a room code and return it
    if (url.pathname === "/api/room/create" && request.method === "POST") {
      const roomCode = generateRoomCode();
      // Touch the DO so it's initialised (idFromName is deterministic)
      env.ROOM.idFromName(roomCode);
      return Response.json({ roomCode }, { headers: CORS_HEADERS });
    }

    // GET /api/ws/:roomCode — WebSocket upgrade forwarded to the DO
    const wsMatch = url.pathname.match(/^\/api\/ws\/([a-z0-9]+)$/);
    if (wsMatch) {
      const roomCode = wsMatch[1];
      const id = env.ROOM.idFromName(roomCode);
      const room = env.ROOM.get(id);
      return room.fetch(request);
    }

    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  },
};

export default main;
