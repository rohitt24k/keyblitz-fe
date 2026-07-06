"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTypingStore } from "@/lib/store-provider";
import ShowWordWithCursor from "./ShowWordWithCursor";
import { gap } from "@/lib/constants";

interface Props {
  typingParagraphRef: React.RefObject<HTMLDivElement>;
  cursorRef: React.RefObject<HTMLDivElement>;
  currentWordRef: React.RefObject<HTMLDivElement>;
  showCursor: boolean;
}

const ParagraphDisplay = ({
  typingParagraphRef,
  cursorRef,
  currentWordRef,
  showCursor,
}: Props) => {
  const level = useTypingStore((s) => s.level);
  const currentWordPosition = useTypingStore((s) => s.currentWordPosition);
  const letterHeight = useTypingStore((s) => s.letterHeight);
  const letterWidth = useTypingStore((s) => s.letterWidth);

  const wordArr = useTypingStore((s) => s.wordArr);
  const wordIndex = useTypingStore((s) => s.wordIndex);
  const letterIndex = useTypingStore((s) => s.letterIndex);

  return (
    <motion.div
      className="flex flex-wrap gap-y-pa text-pa relative w-full mx-8 "
      initial={{ y: 0 }}
      animate={{
        y:
          -1 * (level * letterHeight + Math.max(0, level) * letterHeight * gap),
      }}
      transition={{ type: "tween", duration: 0.05 }}
      style={{ columnGap: 1.5 * letterWidth }}
      ref={typingParagraphRef}
    >
      <motion.div
        ref={cursorRef}
        className="absolute bg-foreground rounded-lg z-10 animate-pulse"
        animate={{
          left:
            currentWordPosition.left +
            letterIndex * letterWidth +
            (letterIndex - 1) * (letterWidth / 5),
          top: currentWordPosition.top,
        }}
        transition={{
          left: { duration: 0.125 },
          top: { duration: 0.1 },
        }}
        style={{
          width: letterWidth / 5,
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

export default ParagraphDisplay;
