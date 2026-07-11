"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ITestProp } from "@/types/test";
import { gap } from "@/lib/constants";
import ChangeLevelOfTypingParagraph from "./ChangeLevelOfTypingParagraph";
import TypingParagraphInputBox from "./TypingParagraphInputBox";
import ParagraphDisplay from "./ParagraphDisplay";
import CursorSVG from "@/images/cursor.svg";
import KeyboardInputHandler from "./KeyboardInputHandler";
import { H3, Muted } from "./ui/typography";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { useTypingStore } from "@/lib/store-provider";

interface TypingParagraphProps {
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

const TypingParagraph = ({
  words,
  onKeyPress,
  onWordComplete,
  onCursorMove,
  onTestStart,
  onTestEnd,
  onTestPause,
  onTestResume,
}: TypingParagraphProps) => {
  const {
    inputRef,
    currentWordRef,
    typingParagraphRef,
    inputIsFocused,
    focusInput,
    handleFocus,
    isModalOpen,
    setIsModalOpen,
    testEnded,
    isReady,
    letterHeight,
    inputHandlers,
  } = useTypingEngine({
    words,
    onKeyPress,
    onWordComplete,
    onCursorMove,
    onTestStart,
    onTestEnd,
    onTestPause,
    onTestResume,
  });

  const wordIndex = useTypingStore((s) => s.wordIndex);
  const totalWords = useTypingStore((s) => s.wordArr.length);
  const testStarted = useTypingStore((s) => s.testStarted);

  const cursorRef = useRef<HTMLDivElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  // Focus the input once letter dimensions are measured and the area is ready
  useEffect(() => {
    if (isReady) focusInput();
  }, [isReady, focusInput]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!inputIsFocused) {
      timeoutId = setTimeout(() => setShowOverlay(true), 1000);
    } else {
      setShowOverlay(false);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [inputIsFocused]);

  useEffect(() => {
    if (!isModalOpen) focusInput();
  }, [isModalOpen, focusInput]);

  if (!isReady) return null;

  return (
    <ChangeLevelOfTypingParagraph currentWordRef={currentWordRef}>
      <KeyboardInputHandler
        handleFocus={handleFocus}
        inputIsFocused={inputIsFocused}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      >
        <>
          {/* <Muted className="text-center mb-8">press ESC for options</Muted>

          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} /> */}

          <>
            <div
              className={`mb-8 ml-8 flex gap-3 text-right font-mono text-sm transition-opacity duration-300 ${testStarted ? "opacity-100" : "opacity-0"}`}
            >
              <H3 className="text-foreground">{wordIndex}</H3>
              <H3 className="text-foreground-light"> / {totalWords}</H3>
            </div>
            <div className="relative">
              {showOverlay && (
                <div
                  className="absolute inset-5 z-20 -m-10 grid cursor-pointer place-items-center rounded-lg backdrop-blur-sm"
                  onClick={handleFocus}
                >
                  <Muted className="flex items-center gap-2">
                    Click to focus <CursorSVG height="16" /> or press any key
                  </Muted>
                </div>
              )}
              <div
                className="relative overflow-hidden select-none"
                style={{
                  height: `${letterHeight * 3 + gap * letterHeight * 2 + letterHeight * 0.25}px`,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFocus();
                }}
              >
                <div className="relative flex w-full">
                  <ParagraphDisplay
                    typingParagraphRef={typingParagraphRef}
                    cursorRef={cursorRef}
                    currentWordRef={currentWordRef}
                    showCursor={inputIsFocused}
                  />
                </div>
                <TypingParagraphInputBox
                  inputRef={inputRef}
                  inputHandlers={inputHandlers}
                  isModalOpen={isModalOpen}
                  testEnded={testEnded}
                />
              </div>
            </div>
          </>
        </>
      </KeyboardInputHandler>
    </ChangeLevelOfTypingParagraph>
  );
};

export default TypingParagraph;
