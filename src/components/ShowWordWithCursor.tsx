"use client";

import React, { useEffect, useState } from "react";
import ShowLetterWithCursor from "./ShowLetterWithCursor";
import { motion } from "framer-motion";
import { useTypingStore, useParagraphStore } from "@/lib/store-provider";

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
  const [ghostsLeftPos, setGhostsLeftPos] = useState<number[]>([]);
  const width = useParagraphStore((s) => s.width);
  const cursors = useTypingStore((s) => s.cursors);

  useEffect(() => {
    const ghostPos = cursors.map((cursor) =>
      cursor.wordIndex === index
        ? cursor.letterIndex * width + cursor.letterIndex * (width / 5)
        : 0
    );
    setGhostsLeftPos(ghostPos);
  }, [width, cursors, index]);

  return (
    <div
      className="flex relative"
      id="wordContainer"
      ref={isCurrent ? currentWordRef : null}
    >
      <div className="flex z-10" style={{ gap: width / 5 }}>
        {wordProp.word.split("").map((letter, i) => (
          <ShowLetterWithCursor
            letter={letter}
            key={i}
            error={wordProp.error?.letterError[i]}
          />
        ))}
      </div>

      {cursors.map((cursor, i) =>
        cursor.wordIndex === index ? (
          <motion.div
            layoutId={`cursor-${i}`}
            key={i}
            initial={{ x: ghostsLeftPos[i] }}
            animate={{ x: ghostsLeftPos[i] }}
            className={`absolute h-full bg-ghost-cursor rounded-lg animate-pulse z-[5] ${
              !showCursor && "!opacity-0"
            }`}
            transition={{ type: "tween", duration: 0.15 }}
            style={{ width: width / 5, left: -width / 5 }}
          />
        ) : null
      )}

      {!isCurrent && index < wordIndex && wordProp.error?.error && (
        <div className="word-error" />
      )}
    </div>
  );
};

export default ShowWordWithCursor;
