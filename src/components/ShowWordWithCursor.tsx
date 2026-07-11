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
  cursorRef: React.RefObject<HTMLDivElement>;
  currentWordRef: React.RefObject<HTMLDivElement>;
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
      className="flex relative"
      id="wordContainer"
      ref={isCurrent ? currentWordRef : null}
    >
      <div className="flex z-10" style={{ gap: letterWidth / 5 }}>
        {wordProp.word.split("").map((letter, i) => (
          <TypingLetter
            letter={letter}
            key={i}
            error={wordProp.error?.letterError[i]}
          />
        ))}
      </div>

      {cursors.map((cursor) =>
        cursor.wordIndex === index ? (
          <motion.div
            layoutId={`cursor-${cursor.name}`}
            key={cursor.name}
            animate={{
              x:
                cursor.letterIndex * letterWidth +
                cursor.letterIndex * (letterWidth / 5),
            }}
            className={`absolute h-full bg-ghost-cursor rounded-lg animate-pulse z-[5] ${
              !showCursor && "opacity-0!"
            }`}
            transition={{ type: "tween", duration: 0.15 }}
            style={{ width: letterWidth / 5, left: -letterWidth / 5 }}
          />
        ) : null,
      )}

      {!isCurrent && index < wordIndex && wordProp.error?.error && (
        <div className="word-error" />
      )}
    </div>
  );
};

export default ShowWordWithCursor;
