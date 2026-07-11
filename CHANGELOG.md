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
