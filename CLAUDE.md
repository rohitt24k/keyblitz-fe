# KeyBlitz v2 — Claude Context

## What this is

A typing speed test web app (like Monkeytype). Users type a displayed paragraph; the app tracks WPM, accuracy, per-second throughput, and error counts. Results are shown in a chart after the test ends.

## Stack

- **Next.js 14** App Router, TypeScript, **Tailwind CSS v4**
- **Zustand** (vanilla `createStore` + React context pattern — see State Management below)
- **shadcn/ui** conventions for components
- **Framer Motion** for word-list scroll animation and ghost cursor movement
- **Recharts** for the results chart
- **Space Mono** font (loaded via `next/font/google`, variable `--font-spacemono`)
- **`@svgr/webpack`** — SVGs imported as React components (`import Foo from "@/images/foo.svg"`)
- **`socket.io-client`** — installed, reserved for multiplayer (not yet wired to any component)
- **`tw-animate-css`** — imported in `globals.css` for Tailwind v4 animation utilities

## File naming conventions

- `src/components/*.tsx` — **PascalCase** (e.g., `ParagraphDisplay.tsx`, `FinishTest.tsx`)
- `src/components/ui/*.tsx` — **lowercase-kebab** (shadcn convention: `button.tsx`, `dialog.tsx`, `modal.tsx`, `typography.tsx`)
- `src/lib/stores/*.ts` — lowercase-kebab (`typing-store.ts`)
- `src/hooks/*.ts` — camelCase with `use` prefix
- `src/utils/*.ts` — camelCase

## Project structure

```
src/
├── actions/
│   └── getWordsToType.ts        # regular function (NOT a server action) — picks words from JSON lists
├── app/
│   ├── globals.css              # Tailwind v4 base (@import "tailwindcss") + CSS vars + custom utilities
│   ├── layout.tsx               # Root layout: StoreProvider > MutableDataProvider > ThemeManager
│   └── (main)/
│       ├── layout.tsx           # Route layout: responsive container + Header + RestartButton
│       └── page.tsx             # Main page: switches between TypingParagraph and FinishTest
├── components/
│   ├── ui/
│   │   ├── button.tsx           # shadcn Button
│   │   ├── dialog.tsx           # shadcn Dialog (Radix)
│   │   ├── modal.tsx            # App modal (wraps Dialog, shows ChaseCursor)
│   │   └── typography.tsx       # H1, H2, H3, P, Muted, Small — use everywhere for text
│   ├── ChangeLevelOfTypingParagraph.tsx  # Watches currentWordRef; computes level and word position
│   ├── Chart.tsx                # Recharts WPM/rawWPM/error chart shown on FinishTest
│   ├── ChaseCursor.tsx          # Ghost cursor config UI (add/remove named cursors with WPM)
│   ├── FindHeightWidth.tsx      # Legacy: measures letter px dims + calls initWords (not used in current page flow)
│   ├── FinishTest.tsx           # Results screen: WPM, accuracy, time, chars, Chart + Restart button
│   ├── GhostCursor.tsx          # Drives ghost cursor setInterval ticks (no DOM, wraps children)
│   ├── Header.tsx               # Top nav with Logo only (theme switcher removed)
│   ├── KeyboardInputHandler.tsx # Global keydown handler when input is unfocused (re-focuses on any key)
│   ├── Logo.tsx                 # KeyBlitz SVG logo
│   ├── ParagraphDisplay.tsx     # Animated word list + text cursor overlay
│   ├── RestartButton.tsx        # Restart button rendered in (main)/layout.tsx (Tab+Enter shortcut unused)
│   ├── ShowWordWithCursor.tsx   # Renders one word + ghost cursor bar(s) at the correct position
│   ├── ThemeManager.tsx         # Thin wrapper div with bg-background; theming not yet active
│   ├── TypingLetter.tsx         # Renders a single letter with correct/soft-error/dark-error coloring
│   ├── TypingParagraph.tsx      # Main typing area — delegates all logic to useTypingEngine
│   └── TypingParagraphInputBox.tsx  # Hidden <input> that captures keystrokes
├── context/
│   └── mutableDataProvider.tsx  # High-frequency ref-based test metrics (NOT Zustand)
├── hooks/
│   ├── useInputFocus.ts         # Manages input focus state + ref
│   ├── useResetStates.ts        # Resets all state for a new test
│   └── useTypingEngine.ts       # Core typing logic hook (measurement, input handling, test lifecycle)
├── lib/
│   ├── constants.ts             # gap = 2/5 (row-gap / line-height ratio for 3-line math)
│   ├── store-provider.tsx       # StoreProvider + useTypingStore (single store, no paragraph store)
│   └── stores/
│       └── typing-store.ts      # All state: words, test lifecycle, ghost cursors, layout geometry
├── types/
│   └── index.d.ts               # Global types: wordProp, ITestProp, typingLetterError, LetterProp
└── utils/
    ├── calculateTimeDiff.ts
    ├── calculateWPM.ts
    └── words-list/1.json … 5.json  # Word lists by difficulty level
```

## State management

Two parallel systems:

### 1. Zustand store (single unified store)

There is only **one** Zustand store. The old `paragraph-store` has been merged into `typing-store`. The pattern is vanilla `createStore`, held in a `useRef` inside the provider, exposed via React context.

**Never use a global singleton** — always go through the provider hook:

```ts
import { useTypingStore } from "@/lib/store-provider";

const wordIndex = useTypingStore((s) => s.wordIndex);
const letterHeight = useTypingStore((s) => s.letterHeight);
```

**TypingStore** (`src/lib/stores/typing-store.ts`):

Word/keystroke state:
- `wordArr`, `correctWordArr`, `wordIndex`, `letterIndex`
- `testStarted`, `testPaused`, `testEnded`, `resetTrigger`
- `cursors: GhostCursor[]` — `{ name, wordIndex, letterIndex, wpm }`

Layout geometry (merged from the old paragraph-store):
- `letterHeight`, `letterWidth` — pixel dimensions of a single `text-pa` character
- `level`, `levelFromTop` — current scroll row
- `currentWordPosition: { top, left }` — position relative to the paragraph container

Actions:
- `initWords(words?)` — populates `wordArr`/`correctWordArr`
- `setWordIndex`, `setLetterIndex`, `setWordProp`
- `startTest()`, `pauseTest()`, `endTest()`, `resetTestFlags()`, `toggleResetTrigger()`
- `setCursors`, `moveCursor(index, wordIndex, letterIndex)`, `resetCursors()`
- `setLetterSize(height, width)`, `setLevel(level, levelFromTop)`, `setWordPosition(top, left)`

Note: state fields are `testStarted/testPaused/testEnded` (boolean), actions are `startTest()/pauseTest()/endTest()` — different names to avoid conflicts.

### 2. MutableDataProvider (React context + refs)

High-frequency test data that must NOT trigger re-renders during typing:
`testProp` ref holds `ITestProp` — timing, char counts, per-word errors, per-second throughput.

Methods: `startTestMethod()`, `endTestMethod()`, `pauseTestMethod()`, `increaseTotalCharTyped()`, `increaseTotalCorrectCharTyped()`, `addWordTimeStamp()`, `addEachSecondWordTyped()`, `addEachWordError()`, `resetTest()`.

```ts
import { useMutableData } from "@/context/mutableDataProvider";
const { startTestMethod, endTestMethod } = useMutableData();
```

## Core hook: `useTypingEngine`

`src/hooks/useTypingEngine.ts` is the central logic hook consumed by `TypingParagraph`. It handles:

- Letter dimension measurement (waits for `document.fonts.ready`, then measures a `text-pa` span)
- Word list initialisation via `initWords(words)`
- All keystroke processing (`onInput`, `onKeyDown`)
- Test lifecycle (start on first keypress, pause on blur, end on last word + Space)
- Per-second char throughput sampling (`setInterval` at 1 s)
- Backspace navigation (single char and `Ctrl+Backspace` back to previous word)
- Arrow key / Enter / `Ctrl+A` prevention

Returns: `{ inputRef, currentWordRef, typingParagraphRef, inputIsFocused, focusInput, handleFocus, isModalOpen, setIsModalOpen, testEnded, isReady, letterHeight, inputHandlers }`.

`isReady` is `letterHeight !== 0` — `TypingParagraph` renders `null` until this is true.

Callbacks the consumer can pass in:
`onKeyPress`, `onWordComplete`, `onCursorMove`, `onTestStart`, `onTestEnd(results)`, `onTestPause`, `onTestResume`.

## Tailwind v4

`globals.css` uses `@import "tailwindcss"` (v4 syntax — no `tailwind.config.js`). All design tokens are declared in `@theme inline { ... }` and consumed as CSS variables. There is no separate config file.

Custom tokens:
| Token | Value / Usage |
|---|---|
| `--spacing-pa: 0.8rem` | Maps to `gap-y-pa` (row gap between lines) |
| `text-pa` | `font-size: 2rem; line-height: 2rem` — typing area text size |
| `--color-foreground-light` | Untyped letter color |
| `--color-foreground-light-1` | Slightly lighter muted text |
| `--color-destructive` / `--color-destructive-light` | Hard error / soft error colors |
| `--color-ghost-cursor` | Ghost cursor bar color |
| `--color-transparent-dark` | Blurred overlay |
| `--breakpoint-xs: 480px` | Extra-small responsive breakpoint |

Custom CSS utility classes in `@layer utilities`:
- `.text-pa` — typing area font/line-height
- `.word-error` — red underline on a completed word that had errors
- `.soft-error` — `color: var(--destructive-light)` on a letter
- `.dark-error` — `color: var(--destructive)` on a letter
- `.glow` — text-shadow outline effect

## Letter error states (`TypingLetter.tsx`)

`error` prop is `undefined | 0 | 1 | 2`:
- `undefined` — not typed yet → `text-foreground-light`
- `0` — typed correctly → `text-foreground`
- `1` — soft error (over-typed beyond word length) → `.soft-error`
- `2` — wrong character → `.dark-error`

## Themes

Currently only the default `dark` theme is active. `ThemeManager` is a thin wrapper `<div>` that applies `bg-background text-foreground`; theme switching via localStorage is not yet implemented. The CSS vars for `dark` are declared on both `:root` and `.dark` (the `dark` class is added to `<body>` in `layout.tsx`).

## Key math

The typing area shows exactly **3 lines** at once. Container height:
```
height = letterHeight * 3 + gap * letterHeight * 2 + letterHeight * 0.25
```
where `gap = 2/5` from `src/lib/constants.ts` (0.8rem gap / 2rem line-height).

`ChangeLevelOfTypingParagraph` computes `level` from the current word's `top` relative to the paragraph container, then `ParagraphDisplay` translates the Framer Motion `y` by `-level * letterHeight * (1 + gap)`.

## Ghost cursor

`GhostCursor.tsx` is a logic-only wrapper (renders `{children}`) that drives `setInterval` ticks per cursor WPM. It advances `moveCursor(index, wordIndex, letterIndex)` in the Zustand store. `ChaseCursor.tsx` is the settings UI. `ShowWordWithCursor.tsx` renders the ghost cursor bar at the correct position using a Framer Motion `layoutId`.

## Typography component

Always use `src/components/ui/typography.tsx` for text — never raw `<h1>/<p>/<small>`:
```tsx
import { H1, H2, H3, P, Muted, Small } from "@/components/ui/typography";
```

## SVG imports

```ts
import MyIcon from "@/images/myicon.svg";
// Used as: <MyIcon className="w-4 h-4" />
```
Handled by `@svgr/webpack` configured in `next.config.mjs`.

## `getWordsToType`

```ts
import { getWordsToType } from "@/actions/getWordsToType";
const words = getWordsToType(1, 50).trim().split(" ");
```
This is a **regular client-callable function**, not a Next.js server action (no `"use server"`). It slices a random window of `numberOfWords` from the chosen JSON word list.

## Adding new word lists

Add JSON files to `src/utils/words-list/` (numbered, e.g. `6.json`). The `getWordsToType` function selects a list by difficulty level (1–5 currently).

## Common commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npx tsc --noEmit # TypeScript check (run before committing)
npm run lint     # ESLint
```

## What NOT to do

- Don't use `useParagraphStore` — there is no separate paragraph store; all layout geometry is in `useTypingStore`.
- Don't use `useAppSelector` / `useAppDispatch` — Redux is gone.
- Don't import Zustand with `create` from `"zustand"` and store globally — use the provider pattern.
- Don't write raw HTML heading/paragraph tags — use the Typography components.
- Don't add `console.log` calls in production code.
- Don't put shadcn ui/ files in PascalCase (they must be lowercase-kebab).
- Don't bypass `MutableDataProvider` for timing/char-count tracking — those refs are the source of truth for results.
- Don't call `getWordsToType` with `"use server"` or treat it as a server action — it's a plain function.
- Don't write Tailwind config in `tailwind.config.js` — the project uses Tailwind v4 where all config lives in `globals.css` under `@theme inline`.
