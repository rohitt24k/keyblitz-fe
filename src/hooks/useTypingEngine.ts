"use client";

import { useMutableData } from "@/context/mutableDataProvider";
import type { ITestProp } from "@/types/test";
import { useInputFocus } from "@/hooks/useInputFocus";
import { useTypingStore } from "@/lib/store-provider";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface UseTypingEngineOptions {
  words: string[];
  onKeyPress?: (char: string, isCorrect: boolean) => void;
  onWordComplete?: (
    wordIndex: number,
    correctChars: number,
    totalChars: number,
  ) => void;
  onCursorMove?: (wordIndex: number, letterIndex: number) => void;
  onTestStart?: () => void;
  onTestEnd?: (results: ITestProp) => void;
  onTestPause?: () => void;
  onTestResume?: () => void;
}

export interface UseTypingEngineReturn {
  inputRef: React.RefObject<HTMLInputElement | null>;
  currentWordRef: React.RefObject<HTMLDivElement | null>;
  typingParagraphRef: React.RefObject<HTMLDivElement | null>;
  inputIsFocused: boolean;
  focusInput: () => void;
  handleFocus: () => void;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  testEnded: boolean;
  isReady: boolean;
  letterHeight: number;
  inputHandlers: {
    onInput: React.FormEventHandler<HTMLInputElement>;
    onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
    onFocus: () => void;
    onBlur: () => void;
  };
}

export const useTypingEngine = ({
  words,
  onKeyPress,
  onWordComplete,
  onCursorMove,
  onTestStart,
  onTestEnd,
  onTestPause,
  onTestResume,
}: UseTypingEngineOptions): UseTypingEngineReturn => {
  const { inputRef, inputIsFocused, focusInput, handleFocus, handleBlur } =
    useInputFocus();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const inputValue = useRef("");
  const currentWordRef = useRef<HTMLDivElement>(null);
  const typingParagraphRef = useRef<HTMLDivElement>(null);
  const charTypedCount = useRef<number>(0);
  const correctCharTypedCount = useRef<number>(0);

  const wordArr = useTypingStore((s) => s.wordArr);
  const wordIndex = useTypingStore((s) => s.wordIndex);
  const letterIndex = useTypingStore((s) => s.letterIndex);
  const correctWordArr = useTypingStore((s) => s.correctWordArr);
  const testStarted = useTypingStore((s) => s.testStarted);
  const testEnded = useTypingStore((s) => s.testEnded);
  const testPaused = useTypingStore((s) => s.testPaused);
  const resetTrigger = useTypingStore((s) => s.resetTrigger);
  const initWords = useTypingStore((s) => s.initWords);
  const setLetterIndex = useTypingStore((s) => s.setLetterIndex);
  const setWordProp = useTypingStore((s) => s.setWordProp);
  const setWordIndex = useTypingStore((s) => s.setWordIndex);

  const letterWidth = useTypingStore((s) => s.letterWidth);
  const letterHeight = useTypingStore((s) => s.letterHeight);
  const setLetterSize = useTypingStore((s) => s.setLetterSize);

  const {
    testProp,
    startTestMethod,
    endTestMethod,
    pauseTestMethod,
    increaseTotalCorrectCharTyped,
    increaseTotalCharTyped,
    addEachWordError,
    addEachSecondWordTyped,
    addWordTimeStamp,
  } = useMutableData();

  // Measure letter pixel dimensions once fonts are ready; gates isReady
  useEffect(() => {
    document.fonts.ready.then(() => {
      const div = document.createElement("div");
      const span = document.createElement("span");
      span.innerText = "W";
      div.appendChild(span);
      div.classList.add("flex");
      span.classList.add("text-pa");
      document.body.appendChild(div);
      const rect = span.getBoundingClientRect();
      setLetterSize(
        Number(rect.height.toFixed(2)),
        Number(rect.width.toFixed(2)),
      );
      document.body.removeChild(div);
    });
  }, [setLetterSize]);

  useEffect(() => {
    initWords(words);
  }, [words, initWords]);

  useEffect(() => {
    inputValue.current = "";
  }, [resetTrigger]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const flushInterval = () => {
      addEachSecondWordTyped({
        charTypedCount: charTypedCount.current,
        correctCharTypedCount: correctCharTypedCount.current,
      });
      charTypedCount.current = 0;
      correctCharTypedCount.current = 0;
    };

    if (testStarted && !testEnded && !testPaused) {
      intervalId = setInterval(flushInterval, 1000);
    }

    if ((testEnded || testPaused) && intervalId) {
      if (charTypedCount.current > 0 || correctCharTypedCount.current > 0) {
        flushInterval();
      }
      clearInterval(intervalId);
      intervalId = null;
    }

    return () => {
      if (intervalId) {
        if (charTypedCount.current > 0 || correctCharTypedCount.current > 0) {
          flushInterval();
        }
        clearInterval(intervalId);
      }
    };
  }, [addEachSecondWordTyped, testStarted, testEnded, testPaused]);

  const checkForError = useCallback(
    (
      index: number,
      inputElement: HTMLInputElement,
      isNewInput: boolean,
      newInput: string | null,
    ) => {
      const { value: typedWord } = inputElement;
      const correctWord = correctWordArr[index];
      const wordToShow = correctWord + typedWord.slice(correctWord.length);

      const cursorRect = currentWordRef.current?.getBoundingClientRect();
      const parentRect = typingParagraphRef.current?.getBoundingClientRect();

      if (cursorRect && parentRect) {
        let wordError = typedWord.length !== correctWord.length;
        const letterError = typedWord.split("").map((letter, i) => {
          if (i > correctWord.length - 1) {
            wordError = true;
            return 1;
          } else if (letter === correctWord[i]) {
            return 0;
          } else {
            wordError = true;
            return 2;
          }
        });

        if (
          parentRect.right - cursorRect.right > letterWidth ||
          !isNewInput ||
          typedWord.length <= correctWord.length
        ) {
          if (isNewInput && newInput !== null) {
            const isCorrect = newInput === correctWord[letterIndex];
            if (isCorrect) {
              increaseTotalCorrectCharTyped();
              correctCharTypedCount.current++;
              increaseTotalCharTyped();
              charTypedCount.current++;
            } else {
              increaseTotalCharTyped();
              charTypedCount.current++;
              addEachWordError({ index: wordIndex });
            }
            onKeyPress?.(newInput, isCorrect);
          }

          setLetterIndex(typedWord.length);
          onCursorMove?.(index, typedWord.length);
          setWordProp(index, {
            word: wordToShow,
            error: { error: wordError, letterError },
            typedWord,
          });
        } else {
          inputElement.value = typedWord.slice(0, -1);
        }
      }
    },
    [
      addEachWordError,
      correctWordArr,
      increaseTotalCharTyped,
      increaseTotalCorrectCharTyped,
      letterIndex,
      letterWidth,
      onCursorMove,
      onKeyPress,
      setLetterIndex,
      setWordProp,
      wordIndex,
    ],
  );

  const onInput: React.FormEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const inputElement = e.target as HTMLInputElement;
      const keyInput = (e.nativeEvent as InputEvent).data;

      if (keyInput === " ") {
        if (inputElement.value !== " ") {
          const typedWord = inputElement.value.slice(0, -1);
          const correctWord = correctWordArr[wordIndex];
          const wordIsCorrect = typedWord === correctWord;
          const correctChars = typedWord
            .split("")
            .filter((c, i) => c === correctWord[i]).length;

          inputElement.value = "";

          if (testStarted && wordIndex === wordArr.length - 1) {
            endTestMethod();
            onTestEnd?.(testProp.current);
          } else if (testPaused !== false) {
            startTestMethod();
            onTestResume?.();
          }

          increaseTotalCharTyped();
          charTypedCount.current++;
          if (wordIsCorrect) {
            increaseTotalCorrectCharTyped();
            correctCharTypedCount.current++;
          }

          onWordComplete?.(wordIndex, correctChars, typedWord.length);
          setWordIndex(wordIndex + 1);
          setLetterIndex(0);
          onCursorMove?.(wordIndex + 1, 0);
          addWordTimeStamp({ index: wordIndex, timeStamp: Date.now() });
        } else {
          inputElement.value = "";
        }
      } else {
        if (
          wordIndex === 0 &&
          letterIndex === 0 &&
          keyInput !== null &&
          !testStarted
        ) {
          startTestMethod();
          onTestStart?.();
        } else if (testPaused !== false) {
          startTestMethod();
          onTestResume?.();
        }
        checkForError(wordIndex, inputElement, keyInput !== null, keyInput);
      }

      inputValue.current = inputElement.value;
    },
    [
      addWordTimeStamp,
      checkForError,
      correctWordArr,
      endTestMethod,
      increaseTotalCharTyped,
      increaseTotalCorrectCharTyped,
      letterIndex,
      onCursorMove,
      onTestEnd,
      onTestResume,
      onTestStart,
      onWordComplete,
      setLetterIndex,
      setWordIndex,
      startTestMethod,
      testPaused,
      testProp,
      testStarted,
      wordArr.length,
      wordIndex,
    ],
  );

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!inputRef.current) return;
      if (e.ctrlKey && e.key === "Backspace") {
        if (inputValue.current === "" && wordIndex > 0) {
          inputValue.current = wordArr[wordIndex - 1].typedWord + " ";
          inputRef.current.value = inputValue.current;
          setWordProp(wordIndex, {
            error: null,
            typedWord: "",
            word: wordArr[wordIndex].word,
          });
          setWordIndex(wordIndex - 1);
        }
      } else if (e.key === "Backspace") {
        if (inputValue.current === "" && wordIndex > 0) {
          inputValue.current = wordArr[wordIndex - 1].typedWord + " ";
          inputRef.current.value = inputValue.current;
          setWordProp(wordIndex, {
            error: null,
            typedWord: "",
            word: wordArr[wordIndex].word,
          });
          setWordIndex(wordIndex - 1);
        }
      } else if (e.key === "Escape") {
        setIsModalOpen(true);
        handleBlur();
      } else if (
        e.key === "Enter" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        (e.ctrlKey && e.key === "a")
      ) {
        e.preventDefault();
      }
    },
    [handleBlur, setWordIndex, wordArr, wordIndex],
  );

  const onBlur = useCallback(() => {
    if (testStarted && !testEnded) {
      pauseTestMethod();
      onTestPause?.();
    }
    handleBlur();
  }, [handleBlur, onTestPause, pauseTestMethod, testEnded, testStarted]);

  return {
    inputRef,
    currentWordRef,
    typingParagraphRef,
    inputIsFocused,
    focusInput,
    handleFocus,
    isModalOpen,
    setIsModalOpen,
    testEnded,
    isReady: letterHeight !== 0,
    letterHeight,
    inputHandlers: {
      onInput,
      onKeyDown,
      onFocus: handleFocus,
      onBlur,
    },
  };
};
