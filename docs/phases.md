# KeyBlitz Multiplayer — Phase Tracker

Status legend: 🔄 In progress · ✅ Complete · ❌ Blocked · ⏳ Pending

---

## Phase 1 — Cloudflare Setup + Room Lifecycle
**Status**: ✅ Complete  
**Completed**: 2026-07-11  
**Validates**: F1, F2, F3

### What was built
- Cloudflare Worker + Durable Object (`worker/index.ts`, `worker/room.ts`)
- Room creation endpoint (`POST /api/room/create`)
- WebSocket upgrade routing (`GET /api/ws/:roomCode`)
- `RoomObject` DO: `join`, `start`, player list broadcast, creator-only start, host reassignment on leave
- Frontend: `useRaceSocket` hook, `RaceLobby`, `Countdown`, `/race/[roomCode]` page
- "Multiplayer race →" link on the main page

### Test checklist (run before marking done)
- [ ] Click "Multiplayer race →" on home → redirected to `/race/abc123`
- [ ] Open link in 3 incognito tabs, enter different usernames → all appear in player list
- [ ] Try "Start Race" from non-creator tab → error logged to console
- [ ] "Start Race" from creator → all tabs show countdown then "Race in progress"
- [ ] Close a tab mid-lobby → remaining players see updated list

### Bugs found / Deviations
_(fill in during testing)_

---

## Phase 2 — Server-authoritative Typing Validation
**Status**: ✅ Complete  
**Completed**: 2026-07-11  
**Validates**: F5

### What was built
- `progress { charIndex }` handler in `RoomObject`: validates range (no backwards jumps, max = text.length), computes WPM server-side from elapsed time
- Added `onCursorMove` prop to `TypingParagraph` and wired it through to `useTypingEngine`
- Race page: renders `TypingParagraph` when `status === "racing"`, converts `(wordIndex, letterIndex)` → absolute `charIndex` and calls `sendProgress`

### Test checklist
- [ ] Start race, type a few characters → progress messages sent in devtools Network tab (max 1 per 150ms)
- [ ] Inspect worker logs: WPM computed and charIndex updated per player
- [ ] Send forged `progress { charIndex: 9999 }` via WS test client → server ignores it (charIndex stays at previous value)
- [ ] Complete the full passage → `onTestEnd` fires locally; server receives final `progress { charIndex: text.length }`

### Bugs found / Deviations
_(fill in during testing)_

---

## Phase 3 — Leaderboard Broadcast
**Status**: ✅ Complete  
**Completed**: 2026-07-11  
**Validates**: F4, F6, N1, N2

### What was built
- `worker/room.ts`: 300ms `setInterval` leaderboard tick starts when racing begins. Sorts all players by `charIndex` desc, takes top-5, sends each player top-5 + their own entry if outside top-5.
- `src/app/race/[roomCode]/page.tsx`:
  - `charIndexToPosition(words, charIndex)` — inverse of `computeCharIndex`, maps server charIndex → `{wordIndex, letterIndex}`
  - `handleLeaderboard` callback: filters out current player, maps opponents to `GhostCursor[]`, calls `setCursors()`
  - On `status === "racing"`, calls `setCursors([])` to clear solo-mode cursors before GhostCursor's WPM animation can start (ensuring server positions drive display, not local animation)
  - `wordsRef` keeps passage words stable without recreating the WebSocket on each render
- The existing `ShowWordWithCursor` + Framer Motion animation smoothly interpolates cursors between 300ms server ticks

### Test checklist
- [ ] Open race in 2 tabs, start race, both type → each tab sees the other player's cursor bar moving in real time
- [ ] Faster typist's cursor is further ahead on the passage
- [ ] Network tab WS frames show `leaderboard` messages arriving every ~300ms
- [ ] Payload size stays constant regardless of how many players (top-5 cap)

### Bugs found / Deviations
_(fill in during testing)_

---

## Phase 4 — Race Finish + Results Screen
**Status**: ✅ Complete  
**Completed**: 2026-07-11  
**Validates**: F7

### What was built
- `worker/room.ts`: `finishedAt` tracked per-player; `checkRaceFinished()` detects all-done; `broadcastFinished()` ranks by finishedAt and broadcasts `{ type: "finished", results }`
- `src/app/race/[roomCode]/page.tsx`: `handleFinished` callback stores results in state; inline results screen shows rank, username, WPM, accuracy + "Back to home" button

### Protocol changes (also shipped in this phase)
- `progress` message changed from `{ charIndex }` → `{ wordIndex, letterIndex }` — no charIndex on the wire
- `status` message changed from `text: string` → `words: string[]` — passage delivered as an array; no `split(" ")` on the frontend
- `src/hooks/useRaceSocket.ts`: `sendProgress(wordIndex, letterIndex)`, `pendingProgressRef` stores `{ wordIndex, letterIndex }`; state has `words: string[]` instead of `text: string`
- `src/app/race/[roomCode]/page.tsx`: removed `computeCharIndex`, `charIndexToPosition`, `wordsRef`; `handleLeaderboard` uses `e.wordIndex, e.letterIndex` directly; `handleCursorMove` passes `(wordIndex, letterIndex)` straight to `sendProgress`

### Test checklist
- [ ] Complete a race with 2+ players → all clients show the results screen with correct ranks
- [ ] Finish mid-race with one player disconnected → remaining players still get the `finished` broadcast
- [ ] "Back to home" button returns to `/`
- [ ] Network WS frames show `{ type: "progress", wordIndex, letterIndex }` (no charIndex)
- [ ] `status` racing message payload contains `words: string[]` array (not a `text` string)

---

## Phase 5 — MongoDB Persistence
**Status**: ⏳ Pending  
**Validates**: F9, N5

### Planned
- `MONGODB_URI` Worker secret
- Fire-and-forget Mongo write in DO on race finish
- Write `race_results` document per schema in `docs/requirements.md`

---

## Phase 6 — Reconnect Handling
**Status**: ⏳ Pending  
**Validates**: F8

### Planned
- `kb_playerId` already stored in localStorage (done in Phase 1)
- DO rejoins existing player slot on reconnect (already stubbed in Phase 1 `handleJoin`)
- Send full race state to reconnecting player

---

## Phase 7 — Hibernation + Idle Cleanup
**Status**: ⏳ Pending  
**Validates**: N3

### Planned
- WebSocket Hibernation API (`ctx.acceptWebSocket`)
- DO alarm for room TTL (10 min after finish or idle lobby)

---

## Phase 8 — Load Testing
**Status**: ⏳ Pending  
**Validates**: N1, N2, N4

### Planned
- `scripts/load-test.ts` — simulates N WS clients
- Measure payload size (should stay flat) and round-trip latency (< 300 ms)
