# KeyBlitz Multiplayer — Phase Tracker

Status legend: 🔄 In progress · ✅ Complete · ❌ Blocked · ⏳ Pending

---

## Phase 1 — Cloudflare Setup + Room Lifecycle
**Status**: ✅ Complete  
**Completed**: 2026-07-11  
**Validates**: F1, F2, F3

### What was built
- `wrangler.toml` — Cloudflare Worker config with Durable Object binding
- `worker/index.ts` — Worker entry: routes `POST /api/room/create` and `GET /api/ws/:roomCode`
- `worker/room.ts` — `RoomObject` DO: join, start, player list broadcast, creator-only start, host reassignment on disconnect
- `worker/types.ts` — Shared type definitions for worker (mirrored in `src/types/race.ts`)
- `worker/tsconfig.json` — Separate TS config using `@cloudflare/workers-types`
- `src/types/race.ts` — Frontend TypeScript types for all WebSocket message payloads
- `src/hooks/useRaceSocket.ts` — WebSocket hook: connection lifecycle, throttled progress sends, message dispatch
- `src/components/RaceLobby.tsx` — Lobby UI: player list, share link, host-only Start button
- `src/components/Countdown.tsx` — Configurable numeric countdown overlay
- `src/app/race/[roomCode]/page.tsx` — Race room page: username prompt → lobby → countdown → typing → results
- `src/app/race/[roomCode]/layout.tsx` — Race-specific layout (Header only, no RestartButton)
- `.env.local.example` — Documents `NEXT_PUBLIC_WORKER_URL` env variable
- `src/app/(main)/page.tsx` — Added "Multiplayer race →" link that creates a room and redirects
- `tsconfig.json` — Excluded `worker/` from Next.js TypeScript compilation
- `CLAUDE.md` — Updated with full multiplayer architecture, Worker patterns, new routes

### Test checklist
- [ ] Click "Multiplayer race →" on home → redirected to `/race/abc123`
- [ ] Open link in 3 incognito tabs, enter different usernames → all appear in player list
- [ ] Try "Start Race" from non-creator tab → error logged to console
- [ ] "Start Race" from creator → all tabs show countdown then "Race in progress"
- [ ] Close a tab mid-lobby → remaining players see updated list

---

## Phase 2 — Server-authoritative Typing Validation
**Status**: ✅ Complete  
**Completed**: 2026-07-11  
**Validates**: F5

### What was built
- `progress { wordIndex, letterIndex }` handler in `RoomObject`: rejects backwards movement and out-of-bounds jumps; computes WPM server-side via internal `charCount()` helper — character position never crosses the wire
- `onCursorMove(wordIndex, letterIndex)` prop added to `TypingParagraph`, threaded through to `useTypingEngine`
- Race page renders `TypingParagraph` when `status === "racing"`; `onCursorMove` calls `sendProgress(wordIndex, letterIndex)` directly

> **Protocol deviation from original plan**: the original spec sent `{ charIndex }` on the wire. We instead send `{ wordIndex, letterIndex }` and compute charIndex server-side only for WPM math. This avoids any charIndex→position conversion in the client and makes the protocol more transparent.

### Test checklist
- [ ] Start race, type a few characters → `progress` messages in devtools Network tab (max 1 per 150ms)
- [ ] Send forged `progress { wordIndex: 999, letterIndex: 0 }` → server ignores it (position stays at previous value)
- [ ] Complete the full passage → `onTestEnd` fires locally; server receives final progress at passage end

---

## Phase 3 — Leaderboard Broadcast
**Status**: ✅ Complete  
**Completed**: 2026-07-11  
**Validates**: F4, F6, N1, N2

### What was built
- `worker/room.ts`: 300ms `setInterval` leaderboard tick starts when racing begins. Sorts all players by `wordIndex/letterIndex` desc, takes top-5, sends each socket top-5 + their own entry if outside top-5
- Leaderboard entries carry `{ wordIndex, letterIndex, wpm, isFinished }` — no charIndex on the wire
- `src/app/race/[roomCode]/page.tsx`:
  - `handleLeaderboard` maps entries directly to `GhostCursor[]` (name, wordIndex, letterIndex, wpm) → `setCursors()`
  - On `status === "racing"`, calls `setCursors([])` to ensure GhostCursor's WPM animation never starts for multiplayer opponents (server positions drive display instead)
- `ShowWordWithCursor.tsx`: uses `cursor.name` (not array index) as Framer Motion `layoutId` and React `key` — stable identity when sort order changes between ticks; position computed inline, not via stale state

### Test checklist
- [ ] Open race in 2 tabs, start race, both type → each tab sees the other's cursor bar moving in real time
- [ ] Faster typist's cursor is further ahead on the passage
- [ ] Network tab WS frames show `leaderboard` messages arriving every ~300ms
- [ ] Payload size stays constant regardless of how many players (top-5 cap)
- [ ] Cursor moves smoothly without erratic jumping (fixed by stable layoutId key)

---

## Phase 4 — Race Finish + Results Screen
**Status**: ✅ Complete  
**Completed**: 2026-07-11  
**Validates**: F7

### What was built
- `worker/room.ts`: `finishedAt` tracked per-player when `wordIndex >= words.length`; `checkRaceFinished()` detects all-done; `broadcastFinished()` sorts by `finishedAt`, assigns ranks, broadcasts `{ type: "finished", results }`
- `src/app/race/[roomCode]/page.tsx`:
  - `handleTestEnd` fires when local player finishes typing (`onTestEnd` prop) — immediately switches to results view without waiting for server
  - **Left column**: WPM, accuracy, time, characters (from `useMutableData`) + Chart (same as solo finish screen)
  - **Right column**: Live leaderboard updating every 300ms, showing "racing" (pulsing) for in-progress players and "done" for finishers. Switches to final ranked list when server broadcasts `finished`
  - `localFinishedRef` keeps `handleLeaderboard` identity stable so the WebSocket never reconnects on state change
- `status` message delivers `words: string[]` (array, not a text string) — no `split(" ")` on the frontend

### Test checklist
- [ ] Complete a race with 2+ players → results screen appears immediately for each finisher
- [ ] Right leaderboard shows "racing" for opponents still typing, "done" for finishers
- [ ] When all players finish, right side switches to final ranked results from server
- [ ] "Back to home" returns to `/`
- [ ] Network WS frames show `{ type: "progress", wordIndex, letterIndex }`
- [ ] `status` racing payload contains `words: string[]` array

---

## Phase 5 — MongoDB Persistence
**Status**: ✅ Complete  
**Completed**: 2026-07-11  
**Validates**: F9, N5

### Planned tasks
1. Install `mongodb` npm package (uses `nodejs_compat` compatibility flag already in `wrangler.toml`)
2. Add `Env` interface to `worker/types.ts` with `ROOM: DurableObjectNamespace` and `MONGODB_URI: string`
3. `worker/room.ts`:
   - Type `env` as `Env`; extract `roomCode` from request URL on first connection
   - `persistResults()` async method: opens a `MongoClient`, inserts one `race_results` document, closes client
   - `broadcastFinished()`: broadcasts `finished` first, then fires `persistResults()` via `this.state.waitUntil()` so the DO stays alive until the write completes
4. Add `MONGODB_URI` secret via `wrangler secret put MONGODB_URI` (local dev: `.dev.vars`)
5. `.dev.vars` excluded from git (add to `.gitignore`)

### Document schema
```jsonc
{
  "roomCode": "abc123",
  "textPassage": "the quick brown fox...",
  "startedAt": ISODate,
  "endedAt": ISODate,
  "players": [
    { "playerId": "uuid", "username": "sam", "wpm": 87, "accuracy": 0.96, "rank": 1, "finishedAt": ISODate }
  ]
}
```

### Test checklist
- [ ] Complete a race → query MongoDB Atlas → confirm `race_results` document exists with correct data
- [ ] Simulate slow Mongo write → confirm `finished` broadcast reaches clients without waiting
- [ ] Run with `MONGODB_URI` unset → write skips gracefully, warning logged, race still ends normally

---

## Phase 6 — Reconnect Handling
**Status**: ⏳ Pending  
**Validates**: F8

### Planned tasks
1. Client already stores `kb_playerId` in localStorage (done in Phase 1)
2. Client on mount: load `kb_playerId` + `kb_username` from localStorage; skip username prompt if both exist
3. `worker/room.ts` `handleJoin`: if `playerId` already in `players` map, reassign new WebSocket to existing slot, preserve all progress (`wordIndex`, `letterIndex`, `wpm`, `finishedAt`), send full current race state (including `words` array if status is `"racing"`)

### Test checklist
- [ ] Join a race, start typing, refresh page → same player slot, progress preserved, not duplicated in player list
- [ ] Reconnect during countdown → player sees countdown immediately

---

## Phase 7 — Hibernation + Idle Cleanup
**Status**: ⏳ Pending  
**Validates**: N3

### Planned tasks
1. Switch from `server.accept()` to WebSocket Hibernation API: `this.state.acceptWebSocket(server)` in `fetch()`
2. Move message handling from `addEventListener("message", ...)` to the DO lifecycle methods: `webSocketMessage(ws, message)`, `webSocketClose(ws)`, `webSocketError(ws)`
3. DO lifecycle methods run on-demand (Cloudflare wakes the DO for each message) rather than keeping the DO alive continuously
4. Add room TTL via alarms:
   - `this.state.storage.setAlarm(Date.now() + 10 * 60 * 1000)` when race finishes or lobby goes idle
   - `alarm()` method: close all hibernated sockets, allow DO to evict

### Test checklist
- [ ] Create a room, leave it idle in lobby → Cloudflare dashboard shows DO goes into hibernation (no active CPU)
- [ ] Race finishes → DO alarm fires ~10 minutes later and evicts the room

---

## Phase 8 — Load Testing
**Status**: ⏳ Pending  
**Validates**: N1, N2, N4

### Planned tasks
1. `scripts/load-test.ts`: spawns N WebSocket clients into a single room, simulates typing progress at realistic speeds, measures:
   - Broadcast payload size at 10 / 100 / 500 clients (should stay flat — top-5 cap)
   - Round-trip latency: `progress` send → `leaderboard` receive (target < 300ms)
2. Document results in `docs/load-test-results.md`

### Test checklist
- [ ] 100 simulated clients in one room → leaderboard payload size stays constant
- [ ] 500 clients → no OOM or crash in the DO
- [ ] Median round-trip latency < 300ms at 100 clients
