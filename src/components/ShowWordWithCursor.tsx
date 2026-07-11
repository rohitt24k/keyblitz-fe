"use client";

import React from "react";
import type { wordProp } from "@/types/word";
import TypingLetter from "./TypingLetter";
import { motion } from "framer-motion";
import { useTypingStore } from "@/lib/store-provider";

interface Props {
  wordProp: wordProp;
  index: number;
  wordIndex: number;
  cursorRef: React.RefObject<HTMLDivElement | null>;
  currentWordRef: React.RefObject<HTMLDivElement | null>;
  letterIndex: number;
  isCurrent: boolean;
  showCursor: boolean;
}

const ShowWordWithCursor = ({
  wordProp,
  index,
  wordIndex,
  cursorRef,
  currentWordRef,
  letterIndex,
  isCurrent,
  showCursor,
}: Props) => {
  const letterWidth = useTypingStore((s) => s.letterWidth);
  const cursors = useTypingStore((s) => s.cursors);

  return (
    <div
      className="relative flex"
      id="wordContainer"
      ref={isCurrent ? currentWordRef : null}
    >
      <div className="z-10 flex" style={{ gap: letterWidth / 5 }}>
        {wordProp.word.split("").map((letter, i) => (
          <TypingLetter
            letter={letter}
            key={i}
            error={wordProp.error?.letterError[i]}
          />
        ))}
      </div>

      {cursors.map((cursor) => {
        if (cursor.wordIndex !== index) return null;
        const clampedIndex = Math.min(cursor.letterIndex, wordProp.word.length);
        return (
          <motion.div
            layoutId={`cursor-${cursor.name}`}
            key={cursor.name}
            animate={{
              x: clampedIndex * letterWidth + clampedIndex * (letterWidth / 5),
            }}
            className={`bg-ghost-cursor absolute z-5 h-full animate-pulse rounded-lg ${
              !showCursor && "opacity-0!"
            }`}
            transition={{ type: "tween", duration: 0.15 }}
            style={{ width: letterWidth / 5, left: -letterWidth / 5 }}
          />
        );
      })}

      {!isCurrent && index < wordIndex && wordProp.error?.error && (
        <div className="word-error" />
      )}
    </div>
  );
};

export default ShowWordWithCursor;
