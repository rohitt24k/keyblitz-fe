"use client";

import { changeCursorProp } from "@/lib/features/ghostCursor/ghostCursor";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import React, { useCallback, useEffect, useMemo, useRef } from "react";

interface IGhostCursorProps {
  children: React.ReactNode;
}

const GhostCursor = ({ children }: IGhostCursorProps) => {
  const { startTest, endTest } = useAppSelector((state) => state.typingTests);
  const { cursors: globalCursor } = useAppSelector(
    (state) => state.ghostCursor
  );
  const { correctWordArr } = useAppSelector((state) => state.typingWord);

  const dispatch = useAppDispatch();

  const timersRef = useRef<(NodeJS.Timeout | null)[]>([]);
  const cursorsRef = useRef(globalCursor);

  /*
    time in min = total chars / (5 * wpm)
    each char time = (time / totalChars) * 60 * 1000 ms
    letterIndex increases each tick; wordIndex advances when word is complete
  */

  useEffect(() => {
    cursorsRef.current = globalCursor;
  }, [globalCursor]);

  const totalCharCount = useMemo(
    () => correctWordArr.reduce((acc, word) => acc + word.length, 0),
    [correctWordArr]
  );

  const setupCursorInterval = useCallback(
    (cursorIndex: number) => {
      const cursor = cursorsRef.current[cursorIndex];
      const time = totalCharCount / (5 * cursor.wpm);
      const eachCharTime = (time / totalCharCount) * 60 * 1000;

      return setInterval(() => {
        const currentCursor = cursorsRef.current[cursorIndex];
        if (currentCursor.wordIndex >= correctWordArr.length) {
          clearInterval(timersRef.current[cursorIndex] as NodeJS.Timeout);
          timersRef.current[cursorIndex] = null;
          return;
        }

        if (
          correctWordArr[currentCursor.wordIndex] &&
          currentCursor.letterIndex + 1 <
            correctWordArr[currentCursor.wordIndex].length
        ) {
          dispatch(
            changeCursorProp({
              index: cursorIndex,
              prop: {
                letterIndex: currentCursor.letterIndex + 1,
                wordIndex: currentCursor.wordIndex,
              },
            })
          );
        } else {
          dispatch(
            changeCursorProp({
              index: cursorIndex,
              prop: { letterIndex: 0, wordIndex: currentCursor.wordIndex + 1 },
            })
          );
        }
      }, eachCharTime);
    },
    [correctWordArr, dispatch, totalCharCount]
  );

  useEffect(() => {
    const isTestRunning = startTest && !endTest;

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
  }, [startTest, endTest, setupCursorInterval]);

  return <>{children}</>;
};

export default GhostCursor;
