// Unified store for the solo typing session.
// Holds the word list (wordArr / correctWordArr), which word and letter the user
// is currently on (wordIndex / letterIndex), test lifecycle booleans
// (testStarted / testPaused / testEnded), a resetTrigger toggle that components
// watch to re-initialise, ghost cursor positions, and the physical pixel geometry
// of the typing area (letterHeight / letterWidth / level / currentWordPosition).
// Never instantiate directly — always consume via useTypingStore() from store-provider.tsx.
import { createStore } from "zustand/vanilla";
import { getWordsToType } from "@/actions/getWordsToType";

type GhostCursor = {
  name: string;
  wordIndex: number;
  letterIndex: number;
  wpm: number;
};

type TypingState = {
  // ── Word / keystroke state ──────────────────────────────────────────────────
  wordArr: wordProp[];
  correctWordArr: string[];
  wordIndex: number;
  letterIndex: number;
  testStarted: boolean;
  testPaused: boolean;
  testEnded: boolean;
  resetTrigger: boolean;
  cursors: GhostCursor[];
  // ── Layout geometry ─────────────────────────────────────────────────────────
  letterHeight: number;
  letterWidth: number;
  level: number;
  levelFromTop: number;
  currentWordPosition: { top: number; left: number };
};

type TypingActions = {
  // ── Word / keystroke actions ────────────────────────────────────────────────
  initWords: (words?: string[]) => void;
  setWordIndex: (index: number) => void;
  setLetterIndex: (index: number) => void;
  setWordProp: (index: number, prop: wordProp) => void;
  startTest: () => void;
  endTest: () => void;
  pauseTest: () => void;
  resetTestFlags: () => void;
  toggleResetTrigger: () => void;
  setCursors: (cursors: GhostCursor[]) => void;
  moveCursor: (index: number, wordIndex: number, letterIndex: number) => void;
  resetCursors: () => void;
  // ── Layout geometry actions ─────────────────────────────────────────────────
  setLetterSize: (height: number, width: number) => void;
  setLevel: (level: number, levelFromTop: number) => void;
  setWordPosition: (top: number, left: number) => void;
};

export type TypingStore = TypingState & TypingActions;

const defaultState: TypingState = {
  wordArr: [],
  correctWordArr: [],
  wordIndex: 0,
  letterIndex: 0,
  testStarted: false,
  testPaused: false,
  testEnded: false,
  resetTrigger: false,
  cursors: [{ name: "cursor1", wordIndex: 0, letterIndex: 0, wpm: 60 }],
  letterHeight: 0,
  letterWidth: 0,
  level: 0,
  levelFromTop: 0,
  currentWordPosition: { top: 0, left: 0 },
};

function buildWordArr(list: string[]) {
  return {
    wordArr: list.map((w) => ({ word: w, error: null, typedWord: "" })),
    correctWordArr: list,
  };
}

export const createTypingStore = (initState: TypingState = defaultState) =>
  createStore<TypingStore>()((set) => ({
    ...initState,

    initWords: (words?: string[]) =>
      set(() => ({
        ...buildWordArr(words ?? getWordsToType(1, 50).trim().split(" ")),
        wordIndex: 0,
        letterIndex: 0,
      })),

    setWordIndex: (index) => set({ wordIndex: index }),
    setLetterIndex: (index) => set({ letterIndex: index }),

    setWordProp: (index, prop) =>
      set((state) => {
        const wordArr = [...state.wordArr];
        if (index >= 0 && index < wordArr.length) wordArr[index] = prop;
        return { wordArr };
      }),

    startTest: () =>
      set({ testStarted: true, testEnded: false, testPaused: false }),
    endTest: () =>
      set({ testEnded: true, testStarted: false, testPaused: false }),
    pauseTest: () => set({ testPaused: true }),
    resetTestFlags: () => set({ testStarted: false, testEnded: false }),
    toggleResetTrigger: () =>
      set((state) => ({ resetTrigger: !state.resetTrigger })),

    setCursors: (cursors) => set({ cursors }),
    moveCursor: (index, wordIndex, letterIndex) =>
      set((state) => {
        const cursors = [...state.cursors];
        if (cursors[index]) {
          cursors[index] = { ...cursors[index], wordIndex, letterIndex };
        }
        return { cursors };
      }),
    resetCursors: () =>
      set((state) => ({
        cursors: state.cursors.map((c) => ({
          ...c,
          wordIndex: 0,
          letterIndex: 0,
        })),
      })),

    setLetterSize: (height, width) =>
      set({ letterHeight: height, letterWidth: width }),
    setLevel: (level, levelFromTop) => set({ level, levelFromTop }),
    setWordPosition: (top, left) => set({ currentWordPosition: { top, left } }),
  }));

export type TypingStoreApi = ReturnType<typeof createTypingStore>;
