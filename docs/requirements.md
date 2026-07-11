# KeyBlitz — Multiplayer Architecture

Version 1.0 · Real-time multiplayer typing race, anonymous players, no user limit.

---

## 1. Overview

KeyBlitz lets a creator start a race, share a link, and have any number of
players join with just a username (no login). When the creator starts, all
players race the same passage in real time. The top players' cursors are
broadcast live to everyone to create competitive pressure. When the race
ends, all players see final results.

The whole system is built on **two components**:

1. **Next.js** — the frontend, hosted on Cloudflare (via the
   `@opennextjs/cloudflare` adapter), including the typing UI you've already
   built.
2. **Cloudflare Durable Objects** — the entire realtime backend. One Durable
   Object instance = one race room. No separate Node.js server exists.

Persistence (final results only) goes to **MongoDB Atlas**, written directly
from the Durable Object.

---

## 2. Architecture

```
┌─────────────────┐        ┌──────────────────────┐        ┌────────────────────┐
│  Next.js client  │  WS    │  Router (Worker /     │  DO    │  Room Durable      │
│  (race UI, one   │ ─────▶ │  Next.js API route)   │ stub   │  Object            │
│  tab per player) │        │  idFromName(roomCode) │ ─────▶ │  (one per race)     │
└─────────────────┘        └──────────────────────┘        └─────────┬──────────┘
                                                                       │
                                                          in-memory:   │
                                                          players map,│
                                                          status, text,│
                                                          char index   │
                                                                       │
                                                          on finish ───┼──▶ MongoDB
                                                          broadcast ◀──┘    (results only)
                                                          top-N leaderboard
                                                          to all sockets
```

Because Next.js is hosted on Cloudflare, the WebSocket upgrade, the router,
and the Durable Object can all live under the same domain — no cross-origin
WebSocket connection needed.

### Request flow

1. Creator opens the app → client calls an endpoint to create a room →
   backend generates a short `roomCode`, creates/initializes the
   corresponding Durable Object, returns a shareable URL:
   `keyblitz.app/race/[roomCode]`.
2. Any player opens that URL, enters a username, and the client opens a
   WebSocket to a route that resolves to that same Durable Object via
   `env.ROOM.idFromName(roomCode)`.
3. The Durable Object is the single source of truth for that room: player
   list, race status, the text passage, and each player's live character
   index.
4. Client sends throttled `progress` messages (~every 100–150ms) as the
   player types. The server — not the client — validates the typed
   characters against the real passage and computes WPM/accuracy. This is
   what prevents a modified client from faking a score.
5. The Durable Object recomputes rankings on a short tick and broadcasts the
   **top-N players only** (not everyone) to every connected socket in the
   room — this is what keeps bandwidth flat regardless of room size.
6. On finish, the Durable Object writes one result document to MongoDB and
   broadcasts final results to all clients.

---

## 3. Key decisions and why

### 3.1 Durable Objects instead of a Node.js server

A traditional approach (Node + Socket.io + Redis) needs: a long-running
process host, a pub/sub layer to broadcast across multiple server instances,
and manual room-to-instance routing. Durable Objects give you all of that
for free — each room is automatically an isolated, single-threaded,
globally-addressable stateful object, created on first connection and shut
down when idle. There is no meaningful benefit to running a parallel Node
server alongside it; it would just be a second, redundant realtime layer.

**Trade-off accepted:** this locks the realtime layer to Cloudflare. That
lock-in is contained — it doesn't touch the frontend or the data layer — as
long as the Durable Object is written as a thin message-handling shell
around plain race-logic functions (validate keystroke, recompute rankings,
finalize race). A future migration would mean rewriting the transport/hosting
glue, not the game logic.

### 3.2 MongoDB instead of Postgres

Race data has no real relational structure — a race and its final result
list are naturally one document each, with no joins needed. MongoDB Atlas
also now works natively from Cloudflare Workers/Durable Objects (TCP/TLS
support was added to the runtime), and pairs particularly well with Durable
Objects specifically, because the DO can keep a single Mongo connection
alive for the room's whole lifetime instead of reconnecting per request —
this is a meaningful latency win over a stateless Worker doing the same
thing.

### 3.3 Anonymous players, no accounts

No login, no `users` or `players` collection. The client generates a
`playerId` (e.g. `crypto.randomUUID()`) once and stores it with the chosen
username in `localStorage`. Both are sent on `join`. The Durable Object
trusts that pairing for the room's duration — it's only there so a page
refresh can reconnect to the same slot instead of double-joining.

**Trade-off accepted:** nothing is verified, so two people can pick the same
username in one room, and there's no cross-race history per person (no
"your best WPM ever" feature possible later without adding real accounts).
Both are acceptable for v1.

### 3.4 Broadcast only the top-N players, not everyone

With no cap on room size, broadcasting every player's position to every
other player is O(n²) traffic. Instead, every client sends its own
throttled progress up, the server re-ranks, and only pushes down the top
5–8 positions plus the player's own. This is what the two-cursor UI in the
current design already implies — the backend just formalizes it.

### 3.5 Server-authoritative progress

The client sends raw keystroke/character-index events; the Durable Object
checks them against the actual passage server-side and computes WPM,
accuracy, and finish time itself. Client-reported stats are never trusted
directly — this is the only realistic anti-cheat measure at this scale and
it's nearly free to add if built in from the start.

---

## 4. Data model

Only one collection is needed for now.

```jsonc
// race_results — one document written per finished race
{
  "_id": ObjectId,
  "roomCode": "abc123",
  "textPassage": "the quick brown fox...",
  "startedAt": ISODate,
  "endedAt": ISODate,
  "players": [
    { "playerId": "uuid", "username": "sam", "wpm": 87, "accuracy": 0.96, "rank": 1, "finishedAt": ISODate },
    { "playerId": "uuid", "username": "alex", "wpm": 79, "accuracy": 0.94, "rank": 2, "finishedAt": ISODate }
  ]
}
```

Live state (players map, in-progress char indices, room status) lives only
in the Durable Object's in-memory storage while the race is happening. It is
never written to Mongo until the race ends — one batched write per race, not
per keystroke.

---

## 5. Message protocol (client ↔ Durable Object)

| Message       | Direction       | Payload                                                  | Purpose                                      |
| ------------- | --------------- | -------------------------------------------------------- | -------------------------------------------- |
| `join`        | client → server | `{ playerId, username }`                                 | Enter the room, get a room snapshot back     |
| `start`       | client → server | `{}` (creator only)                                      | Trigger countdown                            |
| `progress`    | client → server | `{ charIndex }`                                          | Throttled typing progress (~every 100–150ms) |
| `leaderboard` | server → all    | `[{ playerId, username, charIndex, wpm }]`               | Top-N live positions, sent on a tick         |
| `status`      | server → all    | `{ status: "lobby"\|"countdown"\|"racing"\|"finished" }` | Race lifecycle changes                       |
| `finished`    | server → all    | `[{ playerId, username, wpm, accuracy, rank }]`          | Final results                                |

---

## 6. Requirements and how to validate them

### Functional requirements

| #   | Requirement                                                                    | How to validate                                                                                           |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| F1  | Creator can create a race and get a shareable link                             | Create a room, confirm URL contains a room code, open it in a fresh incognito tab                         |
| F2  | Any number of players can join via the link with just a username               | Open the link in 10+ tabs simultaneously with different usernames, confirm all appear in the lobby list   |
| F3  | Only the creator can start the race                                            | Attempt `start` from a non-creator client, confirm it's rejected                                          |
| F4  | All players see the same passage at the same synced countdown                  | Compare passage text and countdown timing across two clients side by side                                 |
| F5  | Typing progress is validated server-side, not trusted from the client          | Send a manually forged `progress` message with an impossible char index, confirm it's rejected or clamped |
| F6  | Top-N player cursors are visible to everyone in real time                      | Race with 3+ players, confirm all clients see the same leading cursors update live                        |
| F7  | Race ends and shows final ranked results to all players                        | Finish a race with multiple players, confirm rank order and stats match on every client                   |
| F8  | A page refresh mid-race reconnects the same player instead of duplicating them | Refresh a player's tab mid-race, confirm they resume rather than appear as a second entrant               |
| F9  | Final results are persisted                                                    | After a race ends, query MongoDB and confirm a `race_results` document exists with correct data           |

### Non-functional requirements

| #   | Requirement                                             | How to validate                                                                                                                                                                                 |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | No hard cap on players per room                         | Load-test a single room with a scripted burst of simulated WebSocket clients (start with 100, then 1,000) and confirm the leaderboard broadcast payload size stays flat, not growing per player |
| N2  | Broadcast traffic doesn't scale linearly with room size | Compare bytes/sec broadcast per client at 10 vs 500 simulated players — should be roughly constant, since only top-N is sent                                                                    |
| N3  | Idle rooms don't consume ongoing compute                | Open a room, leave it idle in the lobby, confirm the Durable Object hibernates (check Cloudflare dashboard/logs for no active CPU time)                                                         |
| N4  | Reasonable end-to-end latency for live cursor updates   | Measure time from a keystroke on client A to it appearing in client B's leaderboard; target under ~300ms on a normal connection                                                                 |
| N5  | Mongo writes don't block the race                       | Confirm the `finished` broadcast reaches clients without waiting on the Mongo write to complete (fire the write, don't await it before broadcasting, but do handle write failure/logging)       |

---

## 7. Suggested build order

1. **Static room lifecycle in the Durable Object** — `join`, `start`,
   in-memory player list, no typing logic yet. Validate F1–F3.
2. **Server-authoritative typing validation** — wire `progress` messages,
   compute char-by-char correctness and WPM server-side. Validate F5.
3. **Leaderboard broadcast** — add the ranking tick and top-N push, connect
   it to your existing cursor UI. Validate F6, N1, N2.
4. **Race finish + results screen** — compute final ranks, broadcast
   `finished`. Validate F7.
5. **MongoDB write on finish** — persist `race_results`. Validate F9, N5.
6. **Reconnect handling** — persist `playerId` client-side, rejoin logic in
   the Durable Object. Validate F8.
7. **Hibernation + idle cleanup** — enable WebSocket Hibernation API, add a
   room TTL/cleanup after the race finishes. Validate N3.
8. **Load test** — simulate large rooms to confirm N1/N2/N4 hold up before
   calling it done.
