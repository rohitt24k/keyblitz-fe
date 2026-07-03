"use client";

import { useAppSelector } from "@/lib/hooks";
import React, { useEffect, useRef, useState } from "react";
import { gap } from "@/lib/constants";
import ChangeLevelOfTypingParagraph from "./ChangeLevelOfTypingParagraph";
import TypingParagraphInputBox from "./TypingParagraphInputBox";
import WordDisplay from "./WordDisplay";
import { useInputFocus } from "@/hooks/useInputFocus";
import CursorSVG from "@/images/cursor.svg";
import GhostCursor from "./GhostCursor";
import KeyboardInputHandler from "./KeyboardInputHandler";
import Modal from "./ui/modal";
import { Muted } from "./ui/typography";

const TypingParagraph = () => {
  const { inputRef, focusInput, handleFocus, handleBlur, inputIsFocused } =
    useInputFocus();
  const [cursorPosition, setCursorPosition] = useState({ left: 0, top: 0 });
  const { height: letterHeight } = useAppSelector(
    (state) => state.typingParagraphProp
  );

  const cursorRef = useRef<HTMLDivElement>(null);
  const typingParagraphRef = useRef<HTMLDivElement>(null);
  const currentWordRef = useRef<HTMLDivElement>(null);

  const [showOverlay, setShowOverlay] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (!inputIsFocused) {
      timeoutId = setTimeout(() => {
        setShowOverlay(true);
      }, 1000);
    } else {
      setShowOverlay(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [inputIsFocused]);

  useEffect(() => {
    if (!isModalOpen) {
      focusInput();
    }
  }, [isModalOpen, focusInput]);

  return (
    <ChangeLevelOfTypingParagraph
      currentWordRef={currentWordRef}
      setCursorPosition={setCursorPosition}
    >
      <KeyboardInputHandler
        handleFocus={handleFocus}
        inputIsFocused={inputIsFocused}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
      >
        <>
          <Muted className="text-center mb-8">press ESC for options</Muted>

          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

          <GhostCursor>
            <div
              className="relative overflow-hidden select-none"
              style={{
                height: `${letterHeight * 3 + gap * letterHeight * 2}px`,
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
                <WordDisplay
                  typingParagraphRef={typingParagraphRef}
                  cursorRef={cursorRef}
                  currentWordRef={currentWordRef}
                  showCursor={inputIsFocused}
                />
              </div>
              <TypingParagraphInputBox
                inputRef={inputRef}
                currentWordRef={currentWordRef}
                typingParagraphRef={typingParagraphRef}
                handleFocus={handleFocus}
                handleBlur={handleBlur}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
              />
            </div>
          </GhostCursor>
        </>
      </KeyboardInputHandler>
    </ChangeLevelOfTypingParagraph>
  );
};

export default TypingParagraph;
