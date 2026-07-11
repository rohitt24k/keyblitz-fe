"use client";

import { useTypingStore } from "@/lib/store-provider";
import React, { useCallback, useEffect, useMemo, useRef } from "react";

interface IGhostCursorProps {
  children: React.ReactNode;
}

const GhostCursor = ({ children }: IGhostCursorProps) => {
  const testStarted = useTypingStore((s) => s.testStarted);
  const testEnded = useTypingStore((s) => s.testEnded);
  const cursors = useTypingStore((s) => s.cursors);
  const correctWordArr = useTypingStore((s) => s.correctWordArr);
  const moveCursor = useTypingStore((s) => s.moveCursor);

  const timersRef = useRef<(NodeJS.Timeout | null)[]>([]);
  const cursorsRef = useRef(cursors);

  /*
    time in min = total chars / (5 * wpm)
    each char time = (time / totalChars) * 60 * 1000 ms
    letterIndex increases each tick; wordIndex advances when word is complete
  */

  useEffect(() => {
    cursorsRef.current = cursors;
  }, [cursors]);

  const totalCharCount = useMemo(
    () => correctWordArr.reduce((acc, word) => acc + word.length, 0),
    [correctWordArr],
  );

  const setupCursorInterval = useCallback(
    (cursorIndex: number) => {
      const cursor = cursorsRef.current[cursorIndex];
      const time = totalCharCount / (5 * cursor.wpm);
      const eachCharTime = (time / totalCharCount) * 60 * 1000;

      return setInterval(() => {
        const current = cursorsRef.current[cursorIndex];
        if (current.wordIndex >= correctWordArr.length) {
          clearInterval(timersRef.current[cursorIndex] as NodeJS.Timeout);
          timersRef.current[cursorIndex] = null;
          return;
        }

        if (
          correctWordArr[current.wordIndex] &&
          current.letterIndex + 1 < correctWordArr[current.wordIndex].length
        ) {
          moveCursor(cursorIndex, current.wordIndex, current.letterIndex + 1);
        } else {
          moveCursor(cursorIndex, current.wordIndex + 1, 0);
        }
      }, eachCharTime);
    },
    [correctWordArr, moveCursor, totalCharCount],
  );

  useEffect(() => {
    const isTestRunning = testStarted && !testEnded;

    if (isTestRunning) {
      cursorsRef.current.forEach((_, index) => {
        timersRef.current[index] = setupCursorInterval(index);
      });
    } else {
      timersRef.current.forEach((timer) => {
        if (timer) clearInterval(timer);
      });
      timersRef.current = [];
    }

    return () => {
      timersRef.current.forEach((timer) => {
        if (timer) clearInterval(timer);
      });
    };
  }, [testStarted, testEnded, setupCursorInterval]);

  return <>{children}</>;
};

export default GhostCursor;
