"use client";

import React from "react";
import { motion } from "framer-motion";
import { useAppSelector } from "@/lib/hooks";
import ShowWordWithCursor from "./ShowWordWithCursor";
import { gap } from "@/lib/constants";

interface Props {
  typingParagraphRef: React.RefObject<HTMLDivElement>;
  cursorRef: React.RefObject<HTMLDivElement>;
  currentWordRef: React.RefObject<HTMLDivElement>;
  showCursor: boolean;
}

const WordDisplay = ({
  typingParagraphRef,
  cursorRef,
  currentWordRef,
  showCursor,
}: Props) => {
  const {
    level,
    currentWordPostiionFromParentContainer,
    height: letterHeight,
    width: letterWidth,
  } = useAppSelector((state) => state.typingParagraphProp);
  const { wordArr, wordIndex, letterIndex } = useAppSelector(
    (state) => state.typingWord
  );

  return (
    <motion.div
      className="flex flex-wrap gap-y-pa text-pa relative w-full mx-8"
      initial={{ y: 0 }}
      animate={{
        y: -1 * (level * letterHeight + Math.max(0, level) * letterHeight * gap),
      }}
      transition={{ type: "tween", duration: 0.05 }}
      style={{
        columnGap: 1.5 * letterWidth,
      }}
      ref={typingParagraphRef}
    >
      <div
        ref={cursorRef}
        className={`absolute h-full bg-foreground rounded-lg animate-pulse z-10 transition-all duration-100 ${
          !showCursor && "!opacity-0"
        }`}
        style={{
          width: letterWidth / 5,
          left:
            currentWordPostiionFromParentContainer.left +
            letterIndex * letterWidth +
            (letterIndex - 1) * (letterWidth / 5) +
            "px",
          top: currentWordPostiionFromParentContainer.top + "px",
          height: letterHeight * 1.1,
        }}
      />

      {wordArr.map((wordProp, index) => (
        <ShowWordWithCursor
          wordProp={wordProp}
          index={index}
          wordIndex={wordIndex}
          cursorRef={cursorRef}
          currentWordRef={currentWordRef}
          isCurrent={index === wordIndex}
          letterIndex={letterIndex}
          showCursor={showCursor}
          key={index}
        />
      ))}
    </motion.div>
  );
};

export default WordDisplay;
