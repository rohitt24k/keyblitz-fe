import { createStore } from "zustand/vanilla";
import { getWordsToType } from "@/actions/getWordsToType";

type GhostCursor = {
  name: string;
  wordIndex: number;
  letterIndex: number;
  wpm: number;
};

type TypingState = {
  wordArr: wordProp[];
  correctWordArr: string[];
  wordIndex: number;
  letterIndex: number;
  testStarted: boolean;
  testPaused: boolean;
  testEnded: boolean;
  resetTrigger: boolean;
  cursors: GhostCursor[];
};

type TypingActions = {
  initWords: () => void;
  setWordIndex: (index: number) => void;
  setLetterIndex: (index: number) => void;
  setWordProp: (index: number, prop: wordProp) => void;
  startTest: () => void;
  endTest: () => void;
  pauseTest: () => void;
  resetTestFlags: () => void;
  toggleResetTrigger: () => void;
  setCursors: (cursors: GhostCursor[]) => void;
  moveCursor: (
    index: number,
    wordIndex: number,
    letterIndex: number
  ) => void;
  resetCursors: () => void;
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
};

function buildWordArr(raw: string) {
  const list = raw.trim().split(" ");
  return {
    wordArr: list.map((w) => ({ word: w, error: null, typedWord: "" })),
    correctWordArr: list,
  };
}

export const createTypingStore = (initState: TypingState = defaultState) =>
  createStore<TypingStore>()((set) => ({
    ...initState,

    initWords: () =>
      set(() => ({
        ...buildWordArr(getWordsToType(1, 50)),
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
  }));

export type TypingStoreApi = ReturnType<typeof createTypingStore>;
