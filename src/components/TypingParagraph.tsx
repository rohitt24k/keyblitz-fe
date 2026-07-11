"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ITestProp } from "@/types/test";
import { gap } from "@/lib/constants";
import ChangeLevelOfTypingParagraph from "./ChangeLevelOfTypingParagraph";
import TypingParagraphInputBox from "./TypingParagraphInputBox";
import ParagraphDisplay from "./ParagraphDisplay";
import CursorSVG from "@/images/cursor.svg";
import GhostCursor from "./GhostCursor";
import KeyboardInputHandler from "./KeyboardInputHandler";
import { Muted } from "./ui/typography";
import { useTypingEngine } from "@/hooks/useTypingEngine";

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

          <GhostCursor>
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
              {showOverlay && (
                <div
                  className="absolute h-full w-full backdrop-blur-sm z-20 grid place-items-center cursor-pointer rounded-lg"
                  onClick={handleFocus}
                >
                  <Muted className="flex items-center gap-2">
                    Click to focus <CursorSVG height="16" /> or press any key
                  </Muted>
                </div>
              )}
              <div className="flex relative w-full">
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
          </GhostCursor>
        </>
      </KeyboardInputHandler>
    </ChangeLevelOfTypingParagraph>
  );
};

export default TypingParagraph;
