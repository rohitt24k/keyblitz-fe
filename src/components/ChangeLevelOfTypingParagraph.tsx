"use client";

import { gap } from "@/lib/constants";
import { useTypingStore, useParagraphStore } from "@/lib/store-provider";
import React, { useCallback, useEffect } from "react";

interface Props {
  children: React.ReactNode;
  currentWordRef: React.RefObject<HTMLDivElement>;
  setCursorPosition: React.Dispatch<
    React.SetStateAction<{ left: number; top: number }>
  >;
}

function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  } as T;
}

const ChangeLevelOfTypingParagraph = ({
  children,
  currentWordRef,
  setCursorPosition,
}: Props) => {
  const letterHeight = useParagraphStore((s) => s.height);
  const letterWidth = useParagraphStore((s) => s.width);
  const setWordPosition = useParagraphStore((s) => s.setWordPosition);
  const setLevel = useParagraphStore((s) => s.setLevel);

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
        (totalHeight + gap * letterHeight) / (letterHeight + gap * letterHeight)
      );
      const h = Math.round(
        (topRelativeToParent + gap * letterHeight) /
          (letterHeight + gap * letterHeight)
      );

      if (h === 0) {
        setLevel(0, h);
        setCursorPosition({
          top: 0,
          left:
            elementRect.left +
            letterWidth * letterIndex +
            letterIndex * (letterWidth / 4),
        });
      } else if (h === totalLevel - 1) {
        setCursorPosition({
          top: 2 * letterHeight + 2 * letterHeight * gap,
          left:
            elementRect.left +
            letterWidth * letterIndex +
            letterIndex * (letterWidth / 4),
        });
        setLevel(h - 2, h);
      } else {
        setCursorPosition({
          top: 1 * letterHeight + 1 * letterHeight * gap,
          left:
            elementRect.left +
            letterWidth * letterIndex +
            letterIndex * (letterWidth / 4),
        });
        setLevel(h - 1, h);
      }
    }
  }, [
    currentWordRef,
    letterHeight,
    letterIndex,
    letterWidth,
    setCursorPosition,
    setLevel,
    setWordPosition,
  ]);

  useEffect(() => {
    changeLevelOfTypingParagraph();
  }, [letterIndex, wordIndex, changeLevelOfTypingParagraph]);

  useEffect(() => {
    const debouncedChangeLevel = debounce(changeLevelOfTypingParagraph, 300);
    window.addEventListener("resize", debouncedChangeLevel);
    return () => window.removeEventListener("resize", debouncedChangeLevel);
  }, [changeLevelOfTypingParagraph]);

  return <>{children}</>;
};

export default ChangeLevelOfTypingParagraph;
