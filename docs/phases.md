# KeyBlitz Multiplayer — Phase Tracker

Status legend: 🔄 In progress · ✅ Complete · ❌ Blocked · ⏳ Pending

---

## Phase 1 — Cloudflare Setup + Room Lifecycle
**Status**: ✅ Complete  
**Date**: 2026-07-11  
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
**Status**: ⏳ Pending  
**Validates**: F5

### Planned
- `progress { charIndex }` handler in `RoomObject`
- Validate charIndex range, compute WPM server-side
- Wire `onCursorMove` in `useTypingEngine` → `sendProgress` in `useRaceSocket`
- Pass server text to `TypingParagraph` in the race page

---

## Phase 3 — Leaderboard Broadcast
**Status**: ⏳ Pending  
**Validates**: F4, F6, N1, N2

### Planned
- 300 ms leaderboard tick in DO (sort by charIndex, top-5 + own)
- Map server charIndex → `{wordIndex, letterIndex}` in hook
- Call `setCursors()` on Zustand store → existing ghost cursor UI renders opponents

---

## Phase 4 — Race Finish + Results Screen
**Status**: ⏳ Pending  
**Validates**: F7

### Planned
- Track `finishedAt` in DO, detect all-finished or 5-min timeout
- Compute final ranks, broadcast `finished`
- Full `RaceResults` component (replace placeholder)

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
