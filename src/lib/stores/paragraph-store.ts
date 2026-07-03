import { createStore } from "zustand/vanilla";

type ParagraphState = {
  height: number;
  width: number;
  level: number;
  levelFromTop: number;
  currentWordPosition: { top: number; left: number };
};

type ParagraphActions = {
  setLetterSize: (height: number, width: number) => void;
  setLevel: (level: number, levelFromTop: number) => void;
  setWordPosition: (top: number, left: number) => void;
};

export type ParagraphStore = ParagraphState & ParagraphActions;

const defaultState: ParagraphState = {
  height: 0,
  width: 0,
  level: 0,
  levelFromTop: 0,
  currentWordPosition: { top: 0, left: 0 },
};

export const createParagraphStore = (
  initState: ParagraphState = defaultState
) =>
  createStore<ParagraphStore>()((set) => ({
    ...initState,
    setLetterSize: (height, width) => set({ height, width }),
    setLevel: (level, levelFromTop) => set({ level, levelFromTop }),
    setWordPosition: (top, left) =>
      set({ currentWordPosition: { top, left } }),
  }));

export type ParagraphStoreApi = ReturnType<typeof createParagraphStore>;
