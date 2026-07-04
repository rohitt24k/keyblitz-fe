# KeyBlitz v2 — Claude Context

## What this is

A typing speed test web app (like Monkeytype). Users type a displayed paragraph; the app tracks WPM, accuracy, per-second throughput, and error counts. Results are shown in a chart after the test ends.

## Stack

- **Next.js 14** App Router, TypeScript, Tailwind CSS v3
- **Zustand** (vanilla `createStore` + React context pattern — see State Management below)
- **shadcn/ui** conventions for components
- **Framer Motion** for word-list scroll animation and ghost cursor movement
- **Recharts** for the results chart
- **Space Mono** font (loaded via `next/font/google`, variable `--font-spacemono`)
- **`@svgr/webpack`** — SVGs imported as React components (`import Foo from "@/images/foo.svg"`)

## File naming conventions

- `src/components/*.tsx` — **PascalCase** (e.g., `WordDisplay.tsx`, `FinishTest.tsx`)
- `src/components/ui/*.tsx` — **lowercase-kebab** (shadcn convention: `button.tsx`, `dialog.tsx`, `modal.tsx`, `typography.tsx`)
- `src/lib/stores/*.ts` — lowercase-kebab (`typing-store.ts`, `paragraph-store.ts`)
- `src/hooks/*.ts` — camelCase with `use` prefix
- `src/utils/*.ts` — camelCase

## Project structure

```
src/
├── actions/
│   └── getWordsToType.ts        # server action — picks words from JSON lists
├── app/(main)/
│   ├── globals.css              # Tailwind base + 7 theme classes + custom utilities
│   ├── layout.tsx               # Root layout: StoreProvider > MutableDataProvider > ThemeManager
│   └── page.tsx                 # Main page: FindHeightWidth → TypingParagraph or FinishTest
├── components/
│   ├── ui/
│   │   ├── button.tsx           # shadcn Button
│   │   ├── dialog.tsx           # shadcn Dialog (Radix)
│   │   ├── modal.tsx            # App modal (wraps Dialog, shows ChaseCursor)
│   │   └── typography.tsx       # H1, H2, H3, P, Muted, Small — use everywhere for text
│   ├── ChangeLevelOfTypingParagraph.tsx  # Detects word-line level; scrolls word list
│   ├── Chart.tsx                # Recharts WPM/accuracy chart shown on FinishTest
│   ├── ChaseCursor.tsx          # Ghost cursor config UI (add/remove named cursors with WPM)
│   ├── FindHeightWidth.tsx      # Measures letter px dimensions; calls initWords
│   ├── FinishTest.tsx           # Results screen shown after test ends
│   ├── GhostCursor.tsx          # Drives ghost cursor intervals (no DOM, wraps children)
│   ├── Header.tsx               # Top nav with Logo + theme switcher stub
│   ├── KeyboardInputHandler.tsx # Global keydown handler (Escape, Tab, etc.)
│   ├── Logo.tsx                 # KeyBlitz SVG logo
│   ├── RestartButton.tsx        # Keyboard shortcut (Tab+Enter) restart button
│   ├── ShowLetterWithCursor.tsx # Renders a single letter with correct/error coloring
│   ├── ShowWordWithCursor.tsx   # Renders a word; reports position for cursor placement
│   ├── ThemeManager.tsx         # Applies theme class to <body>; reads from localStorage
│   ├── TypingParagraph.tsx      # Main typing area orchestrator
│   ├── TypingParagraphInputBox.tsx  # Hidden <input> that captures keystrokes
│   └── WordDisplay.tsx          # Animated word list with caret overlay
├── context/
│   └── mutableDataProvider.tsx  # High-frequency ref-based test metrics (NOT Zustand)
├── hooks/
│   ├── useInputFocus.ts         # Manages input focus state + ref
│   └── useResetStates.ts        # Resets all state for a new test
├── lib/
│   ├── constants.ts             # gap = 2/5 (row-gap / line-height ratio for 3-line math)
│   ├── store-provider.tsx       # Combined StoreProvider + useTypingStore + useParagraphStore
│   ├── stores/
│   │   ├── typing-store.ts      # Words, test lifecycle, ghost cursor positions
│   │   └── paragraph-store.ts  # Letter px size, line level, current word position
│   └── utils.ts                 # cn() from clsx + tailwind-merge
├── types/
│   └── index.d.ts               # Global types: wordProp, ITestProp, typingLetterError
└── utils/
    ├── calculateTimeDiff.ts
    ├── calculateWPM.ts
    └── words-list/1.json … 5.json  # Word lists by difficulty level
```

## State management

Two parallel systems:

### 1. Zustand stores (Zustand vanilla + React context)

The intended Next.js App Router pattern: `createStore` from `zustand/vanilla`, stored in a `useRef` inside the provider, exposed via React context + `useStore`.

**Never use a global singleton** — always go through the provider hooks:

```ts
import { useTypingStore, useParagraphStore } from "@/lib/store-provider";

const wordIndex = useTypingStore((s) => s.wordIndex);
const height = useParagraphStore((s) => s.height);
```

**TypingStore** (`src/lib/stores/typing-store.ts`):
- State: `wordArr`, `correctWordArr`, `wordIndex`, `letterIndex`, `testStarted`, `testPaused`, `testEnded`, `resetTrigger`, `cursors`
- Actions: `initWords()`, `setWordIndex()`, `setLetterIndex()`, `setWordProp()`, `startTest()`, `endTest()`, `pauseTest()`, `resetTestFlags()`, `toggleResetTrigger()`, `setCursors()`, `moveCursor()`, `resetCursors()`
- Note: state fields are `testStarted/testPaused/testEnded` (boolean), actions are `startTest()/pauseTest()/endTest()` — different names to avoid conflicts.

**ParagraphStore** (`src/lib/stores/paragraph-store.ts`):
- State: `height`, `width` (letter px dims), `level`, `levelFromTop`, `currentWordPosition: { top, left }`
- Actions: `setLetterSize()`, `setLevel()`, `setWordPosition()`

### 2. MutableDataProvider (React context + refs)

High-frequency test data that must NOT trigger re-renders during typing:
`testProp` ref holds `ITestProp` — timing, char counts, per-word errors, per-second throughput.

Methods: `startTestMethod()`, `endTestMethod()`, `pauseTestMethod()`, `increaseTotalCharTyped()`, `increaseTotalCorrectCharTyped()`, `addWordTimeStamp()`, `addEachSecondWordTyped()`, `addEachWordError()`, `resetTest()`.

```ts
import { useMutableData } from "@/context/mutableDataProvider";
const { startTestMethod, endTestMethod } = useMutableData();
```

## Tailwind custom tokens

| Token | Usage |
|---|---|
| `text-pa` / `gap-y-pa` | Typing area font size (2rem/2rem line-height) and row gap (0.8rem) |
| `font-sans` | Space Mono (mapped via `--font-spacemono`) |
| `text-foreground-light` | Muted text color |
| `text-destructive` / `text-destructive-light` | Typing errors |
| `bg-ghost-cursor` | Ghost cursor bar color |
| `bg-transparent-dark` | Blurred overlay |

## Themes

7 themes defined as CSS classes on `<body>` in `globals.css`:
`theme-dark`, `theme-new`, `theme-windows98`, `theme-pastel`, `theme-deepsea`, `theme-test`, `theme-daylight`

`ThemeManager` reads/writes `localStorage` and applies the class. Default is `theme-dark`.

## Key math

The typing area shows exactly **3 lines** at once. The container height is:
```
height = letterHeight * 3 + gap * letterHeight * 2
```
where `gap = 2/5` from `src/lib/constants.ts` (0.8rem gap / 2rem line-height).

The word list scrolls via Framer Motion `y` translate keyed on `level` from the paragraph store.

## Typography component

Always use `src/components/ui/typography.tsx` for text — never raw `<h1>/<p>/<small>`:
```tsx
import { H1, H2, H3, P, Muted, Small } from "@/components/ui/typography";
```

## Ghost cursor

`GhostCursor.tsx` is a logic-only wrapper (renders `{children}`) that drives `setInterval` ticks per cursor WPM. It advances `moveCursor(index, wordIndex, letterIndex)` in the Zustand store. `ChaseCursor.tsx` is the settings UI. `ShowWordWithCursor.tsx` renders the ghost cursor bar at the correct position.

## SVG imports

```ts
import MyIcon from "@/images/myicon.svg";
// Used as: <MyIcon className="w-4 h-4" />
```
Handled by `@svgr/webpack` configured in `next.config.mjs`.

## Adding new word lists

Add JSON files to `src/utils/words-list/` (numbered, e.g. `6.json`). The `getWordsToType` action selects a list by difficulty level (1–5 currently).

## Common commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npx tsc --noEmit # TypeScript check (run before committing)
npm run lint     # ESLint
```

## What NOT to do

- Don't use `useAppSelector` / `useAppDispatch` — Redux is gone.
- Don't import Zustand with `create` from `"zustand"` and store globally — use the provider pattern.
- Don't write raw HTML heading/paragraph tags — use the Typography components.
- Don't add `console.log` calls in production code.
- Don't put shadcn ui/ files in PascalCase (they must be lowercase-kebab).
- Don't bypass `MutableDataProvider` for timing/char-count tracking — those refs are the source of truth for results.
