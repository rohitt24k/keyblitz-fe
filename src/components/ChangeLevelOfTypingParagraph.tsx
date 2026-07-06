"use client";

import { gap } from "@/lib/constants";
import { useTypingStore } from "@/lib/store-provider";
import React, { useCallback, useEffect } from "react";

interface Props {
  children: React.ReactNode;
  currentWordRef: React.RefObject<HTMLDivElement>;
}

function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number,
): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  } as T;
}

const ChangeLevelOfTypingParagraph = ({ children, currentWordRef }: Props) => {
  const letterHeight = useTypingStore((s) => s.letterHeight);
  const setWordPosition = useTypingStore((s) => s.setWordPosition);
  const setLevel = useTypingStore((s) => s.setLevel);

  const letterIndex = useTypingStore((s) => s.letterIndex);
  const wordIndex = useTypingStore((s) => s.wordIndex);

  const changeLevelOfTypingParagraph = useCallback(() => {
    const elementRect = currentWordRef.current?.getBoundingClientRect();
    const parentRect =
      currentWordRef.current?.parentElement?.getBoundingClientRect();

    if (elementRect && parentRect) {
      const topRelativeToParent = elementRect.top - parentRect.top;
      const leftRelativeToParent = elementRect.left - parentRect.left;

      setWordPosition(topRelativeToParent, leftRelativeToParent);

      /*
        Math: n * h + (n - 1) * g * h = totalHeight
        Solving: n = (totalHeight + g * h) / (h + g * h)
      */

      const totalHeight = parentRect.height;
      const totalLevel = Math.round(
        (totalHeight + gap * letterHeight) /
          (letterHeight + gap * letterHeight),
      );
      const h = Math.round(
        (topRelativeToParent + gap * letterHeight) /
          (letterHeight + gap * letterHeight),
      );

      if (h === 0) {
        setLevel(0, h);
      } else if (h === totalLevel - 1) {
        setLevel(h - 2, h);
      } else {
        setLevel(h - 1, h);
      }
    }
  }, [currentWordRef, letterHeight, setLevel, setWordPosition]);

  useEffect(() => {
    changeLevelOfTypingParagraph();
  }, [letterIndex, wordIndex, changeLevelOfTypingParagraph]);

  // recalculate when the window is resized
  useEffect(() => {
    const debouncedChangeLevel = debounce(changeLevelOfTypingParagraph, 300);
    window.addEventListener("resize", debouncedChangeLevel);
    return () => window.removeEventListener("resize", debouncedChangeLevel);
  }, [changeLevelOfTypingParagraph]);

  return <>{children}</>;
};

export default ChangeLevelOfTypingParagraph;
