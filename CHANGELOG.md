# Changelog

All notable changes to KeyBlitz are logged here.  
Format: `[Phase N] YYYY-MM-DD — description`

---

## [Phase 1] 2026-07-11

### Added

- `wrangler.toml` — Cloudflare Worker config with Durable Object binding
- `worker/index.ts` — Worker entry: routes `POST /api/room/create` and `GET /api/ws/:roomCode`
- `worker/room.ts` — `RoomObject` Durable Object: join, start, broadcast, host reassignment
- `worker/types.ts` — Shared type definitions for worker (mirrored in `src/types/race.ts`)
- `worker/tsconfig.json` — TypeScript config for Worker code (uses `@cloudflare/workers-types`)
- `src/types/race.ts` — Frontend TypeScript types for all WebSocket message payloads
- `src/hooks/useRaceSocket.ts` — WebSocket hook: connection lifecycle, throttled progress sends, message dispatch
- `src/components/RaceLobby.tsx` — Lobby UI: player list, share link, host-only Start button
- `src/components/Countdown.tsx` — Configurable numeric countdown overlay
- `src/app/race/[roomCode]/page.tsx` — Race room page: username prompt → lobby → countdown → typing → results
- `src/app/race/[roomCode]/layout.tsx` — Race-specific layout (Header only, no RestartButton)
- `.env.local.example` — Documents `NEXT_PUBLIC_WORKER_URL` env variable
- `docs/phases.md` — Phase-by-phase status tracker
- `CHANGELOG.md` — This file

### Changed

- `src/app/(main)/page.tsx` — Added "Multiplayer race →" link that creates a room and redirects
- `tsconfig.json` — Excluded `worker/` from Next.js TypeScript compilation
- `CLAUDE.md` — Updated with multiplayer architecture, Worker patterns, new routes

### Removed

- `socket.io-client` dependency (replaced by native WebSocket API)

---

## [Phase 2] 2026-07-11

### Added

- `worker/room.ts` — `handleProgress`: validates charIndex (no backwards jumps, max = text.length), computes WPM server-side

### Changed

- `src/components/TypingParagraph.tsx` — added `onCursorMove` prop, threaded through to `useTypingEngine`
- `src/app/race/[roomCode]/page.tsx` — renders `TypingParagraph` during "racing" status; `onCursorMove` converts `(wordIndex, letterIndex)` → absolute `charIndex` and calls `sendProgress`
- `worker/room.ts` — added `wpm` field to `Player` interface

---

## [Phase 3] 2026-07-11

### Added

- `worker/room.ts` — `startLeaderboardTick` / `stopLeaderboardTick` / `broadcastLeaderboard`: 300ms interval broadcasting top-5 players by charIndex to every socket
- `src/app/race/[roomCode]/page.tsx` — `charIndexToPosition` helper (inverse of `computeCharIndex`); `handleLeaderboard` callback that maps server entries → `GhostCursor[]` → `setCursors()`

### Changed

- `src/app/race/[roomCode]/page.tsx` — clears cursor store when status transitions to "racing" (prevents GhostCursor's WPM-based animation from conflicting with server positions); `wordsRef` used to avoid recreating the WebSocket on passage text changes

---

## [Phase 4] 2026-07-11

### Added

- `worker/room.ts` — `checkRaceFinished` / `broadcastFinished`: detects all players done, sorts by `finishedAt`, assigns ranks, broadcasts `{ type: "finished", results }`
- `src/app/race/[roomCode]/page.tsx` — inline results screen: rank, username, WPM, accuracy, "Back to home" button

### Changed (protocol refactor, shipped alongside Phase 4)

- `worker/types.ts` + `src/types/race.ts` — `ClientMessage.progress` changed from `{ charIndex }` to `{ wordIndex, letterIndex }`; `ServerMessage.status` changed from `text: string` to `words: string[]`; `LeaderboardEntry` uses `wordIndex/letterIndex` (no charIndex)
- `worker/room.ts` — `Player` stores `wordIndex/letterIndex`; `charCount()` helper computes WPM internally; leaderboard tick broadcasts `wordIndex/letterIndex` directly
- `src/hooks/useRaceSocket.ts` — `sendProgress(wordIndex, letterIndex)` (was `sendProgress(charIndex)`); state field `words: string[]` (was `text: string`); `pendingProgressRef` stores `{ wordIndex, letterIndex }`
- `src/app/race/[roomCode]/page.tsx` — removed `computeCharIndex`, `charIndexToPosition`, `wordsRef`; `handleCursorMove` passes positions straight to `sendProgress`; `handleLeaderboard` reads `e.wordIndex/e.letterIndex` directly

### Fixed (post-Phase 4 bug fixes)

- `src/components/ShowWordWithCursor.tsx` — cursor erratic movement fixed: changed `layoutId` and `key` from array index to `cursor.name` (stable across sort-order changes); removed stale `ghostsLeftPos` state; position now computed inline
- `src/app/race/[roomCode]/page.tsx` — results screen redesigned: left column shows personal stats + chart (matching solo finish screen), right column shows live leaderboard updating every 300ms with "racing"/"done" status per player; `onTestEnd` triggers results immediately when local player finishes without waiting for all players

---

## [Phase 5] 2026-07-11

### Added

- `mongodb` package — native MongoDB driver (works via `nodejs_compat` Cloudflare flag)
- `worker/types.ts` — `Env` interface (`ROOM: DurableObjectNamespace`, `MONGODB_URI: string`)
- `worker/room.ts` — `persistResults()`: opens `MongoClient`, inserts one `race_results` document, closes client; called via `this.state.waitUntil()` in `broadcastFinished()` so the DO stays alive until the write completes; skips gracefully if `MONGODB_URI` is unset
- `worker/room.ts` — `endTime` field tracks race end timestamp; `roomCode` extracted from request URL on first connection
- `.dev.vars.example` — documents `MONGODB_URI` env variable for local dev
- `.gitignore` — added `.dev.vars` exclusion

### Changed

- `worker/index.ts` — removed local `Env` interface; imports `Env` from `./types`
- `worker/room.ts` — `env` typed as `Env` (was `object`)
- `docs/phases.md` — updated Phases 1–4 with accurate what-was-built descriptions and deviations; fleshed out Phases 5–8 with detailed task lists

---

## [Phase 7] 2026-07-12

### Changed

- `worker/room.ts` — full rewrite for WebSocket Hibernation API:
  - `state.acceptWebSocket(server)` replaces `server.accept()` + `addEventListener` calls
  - `webSocketMessage`, `webSocketClose`, `webSocketError`, `alarm` DO lifecycle methods added
  - `Player` interface no longer holds a `socket` field — live sockets live in `sockets: Map<string, WebSocket>`
  - `ws.serializeAttachment({ playerId })` written at join; `ws.deserializeAttachment()` replaces `socketToPlayer` Map
  - `boot()`: reads `PersistedState` from `storage.get("s")`, rehydrates players, re-attaches live hibernated sockets via `state.getWebSockets()`, restarts leaderboard tick if needed — guarded by `booted` flag
  - `persist()`: serialises full room state to `storage.put("s", ...)` — called after join, start, finish, disconnect
  - Countdown `setTimeout` replaced by `state.storage.setAlarm(Date.now() + 5000)` — survives hibernation
  - `alarm()`: if `status === "countdown"` → transitions to racing; else → room TTL cleanup (`storage.deleteAll()`)
  - Room TTL alarm set to `Date.now() + 10 * 60 * 1000` in `broadcastFinished()`
  - `broadcastLeaderboard()` stops tick when no connected players remain — lets DO hibernate between races

---

## [Post-Phase 6] 2026-07-12

### Added

- `worker/words.ts` — imports all 5 word-list JSON files (`src/utils/words-list/1–5.json`); `getPassage(count)` picks a random window of `count` words from the combined ~4000-word pool
- `worker/tsconfig.json` — added `resolveJsonModule: true` and included JSON word-list paths

### Changed

- `worker/room.ts` — replaced hardcoded `PASSAGES` array with `getPassage(50)` in `handleStart`; every race now gets a unique 50-word passage drawn from the full word pool

---

## [Phase 6] 2026-07-11

### Added

- `worker/room.ts` — `isConnected: boolean` field on `Player`; reconnect logic in `handleJoin` (preserves all progress, restores socket, replays `finalResults` if race is over); `broadcastExcept()` helper to avoid echoing status back to the joining socket; `finalResults` cached on `RoomObject` for replaying to late reconnects
- `src/app/race/[roomCode]/page.tsx` — "Race ended while you were away" screen for reconnect-after-finish edge case

### Changed

- `worker/room.ts` — `handleClose` split by status: lobby → full removal; racing/countdown/finished → mark `isConnected = false` (keep slot); `checkRaceFinished` treats disconnected players as done so remaining players aren't blocked; `broadcast` and `broadcastLeaderboard` skip disconnected players; `snapshots()` returns only connected players; removed `.slice(0, 10)` debug artifact that was limiting passages to 10 words
- `src/app/race/[roomCode]/page.tsx` — `RacePage` now renders `null` while localStorage is being read (prevents flash of username prompt on reconnect)
