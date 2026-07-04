"use client";

import { useMutableData } from "@/context/mutableDataProvider";
import { useTypingStore, useParagraphStore } from "@/lib/store-provider";
import React, { useEffect, useRef } from "react";

interface Props {
  inputRef: React.RefObject<HTMLInputElement>;
  currentWordRef: React.RefObject<HTMLDivElement>;
  typingParagraphRef: React.RefObject<HTMLDivElement>;
  handleFocus: () => void;
  handleBlur: () => void;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const TypingParagraphInputBox = ({
  inputRef,
  currentWordRef,
  typingParagraphRef,
  handleFocus,
  handleBlur,
  isModalOpen,
  setIsModalOpen,
}: Props) => {
  const inputValue = useRef("");

  const wordArr = useTypingStore((s) => s.wordArr);
  const wordIndex = useTypingStore((s) => s.wordIndex);
  const letterIndex = useTypingStore((s) => s.letterIndex);
  const correctWordArr = useTypingStore((s) => s.correctWordArr);
  const testStarted = useTypingStore((s) => s.testStarted);
  const testEnded = useTypingStore((s) => s.testEnded);
  const testPaused = useTypingStore((s) => s.testPaused);
  const resetTrigger = useTypingStore((s) => s.resetTrigger);

  const setLetterIndex = useTypingStore((s) => s.setLetterIndex);
  const setWordProp = useTypingStore((s) => s.setWordProp);
  const setWordIndex = useTypingStore((s) => s.setWordIndex);

  const letterWidth = useParagraphStore((s) => s.width);

  const {
    startTestMethod,
    endTestMethod,
    pauseTestMethod,
    increaseTotalCorrectCharTyped,
    increaseTotalCharTyped,
    addEachWordError,
    addEachSecondWordTyped,
    addWordTimeStamp,
  } = useMutableData();

  const charTypedCount = useRef<number>(0);
  const correctCharTypedCount = useRef<number>(0);

  function checkForError(
    index: number,
    inputElement: HTMLInputElement,
    isNewInput: boolean,
    newInput: string | null
  ) {
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
        if (isNewInput) {
          if (newInput === correctWord[letterIndex]) {
            increaseTotalCorrectCharTyped();
            correctCharTypedCount.current++;
            increaseTotalCharTyped();
            charTypedCount.current++;
          } else {
            increaseTotalCharTyped();
            charTypedCount.current++;
            addEachWordError({ index: wordIndex });
          }
        }

        setLetterIndex(typedWord.length);
        setWordProp(index, {
          word: wordToShow,
          error: { error: wordError, letterError },
          typedWord,
        });
      } else {
        inputElement.value = typedWord.slice(0, -1);
      }
    }
  }

  function handleTestPauseWhenBlurred() {
    if (testStarted && !testEnded) {
      pauseTestMethod();
    }
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const intervalFunction = () => {
      addEachSecondWordTyped({
        charTypedCount: charTypedCount.current,
        correctCharTypedCount: correctCharTypedCount.current,
      });
      charTypedCount.current = 0;
      correctCharTypedCount.current = 0;
    };

    if (testStarted && !testEnded && !testPaused) {
      intervalId = setInterval(intervalFunction, 1000);
    }

    if ((testEnded || testPaused) && intervalId) {
      if (charTypedCount.current > 0 || correctCharTypedCount.current > 0) {
        intervalFunction();
      }
      clearInterval(intervalId);
      intervalId = null;
    }

    return () => {
      if (intervalId) {
        if (charTypedCount.current > 0 || correctCharTypedCount.current > 0) {
          intervalFunction();
        }
        clearInterval(intervalId);
      }
    };
  }, [addEachSecondWordTyped, testStarted, testEnded, testPaused]);

  useEffect(() => {
    inputValue.current = "";
  }, [resetTrigger]);

  return (
    <input
      type="text"
      ref={inputRef}
      id="main-user-typing-cursor"
      value={inputValue.current}
      disabled={testEnded || isModalOpen}
      className="absolute inset-0 outline-none border-none bg-transparent -z-10 appearance-none text-transparent user-select-none"
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.ctrlKey && e.key === "Backspace") {
          if (inputValue.current === "" && wordIndex - 1 >= 0) {
            inputValue.current = wordArr[wordIndex - 1].typedWord + " ";
            setWordIndex(wordIndex - 1);
          }
        } else if (e.key === "Backspace") {
          if (inputValue.current === "" && wordIndex - 1 >= 0) {
            inputValue.current = wordArr[wordIndex - 1].typedWord + " ";
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
      }}
      onInput={(e: React.FormEvent<HTMLInputElement>) => {
        const inputElement = e.target as HTMLInputElement;
        const keyInput = (e.nativeEvent as InputEvent).data;

        if (keyInput === " ") {
          if (inputElement.value !== " ") {
            const typedWord = inputElement.value.slice(0, -1);
            const wordIsCorrect = typedWord === correctWordArr[wordIndex];

            inputElement.value = "";
            if (testStarted && wordIndex === wordArr.length - 1) {
              endTestMethod();
            } else if (testPaused !== false) {
              startTestMethod();
            }
            increaseTotalCharTyped();
            charTypedCount.current++;
            if (wordIsCorrect) {
              increaseTotalCorrectCharTyped();
              correctCharTypedCount.current++;
            }
            setWordIndex(wordIndex + 1);
            setLetterIndex(0);
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
          } else if (testPaused !== false) {
            startTestMethod();
          }
          checkForError(wordIndex, inputElement, keyInput !== null, keyInput);
        }

        inputValue.current = inputElement.value;
      }}
      onFocus={handleFocus}
      onBlur={() => {
        handleTestPauseWhenBlurred();
        handleBlur();
      }}
      autoComplete="off"
      spellCheck={false}
      autoCapitalize="off"
    />
  );
};

export default TypingParagraphInputBox;
