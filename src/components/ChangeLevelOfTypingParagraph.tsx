"use client";

import { gap } from "@/lib/constants";
import {
  currentWordTopAndLeftPos,
  increaseLevel,
} from "@/lib/features/typingParagraphProp/typingParagraphProp";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import React, { useCallback, useEffect } from "react";

interface Props {
  children: React.ReactNode;
  currentWordRef: React.RefObject<HTMLDivElement>;
  setCursorPosition: React.Dispatch<
    React.SetStateAction<{
      left: number;
      top: number;
    }>
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
  const {
    height: letterHeight,
    width: letterWidth,
    level,
  } = useAppSelector((state) => state.typingParagraphProp);
  const { letterIndex, wordIndex } = useAppSelector(
    (state) => state.typingWord
  );

  const dispatch = useAppDispatch();

  const changeLevelOfTypingParagraph = useCallback(() => {
    const elementRect = currentWordRef.current?.getBoundingClientRect();
    const parentRect =
      currentWordRef.current?.parentElement?.getBoundingClientRect();

    if (elementRect && parentRect) {
      const topRelativeToParent = elementRect.top - parentRect.top;
      const leftRelativeToParent = elementRect.left - parentRect.left;

      dispatch(
        currentWordTopAndLeftPos({
          topPos: topRelativeToParent,
          leftPos: leftRelativeToParent,
        })
      );

      /*
        Math: n * h + (n - 1) * g * h = totalHeight
        Solving for n: n = (totalHeight + g * h) / (h + g * h)
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
        dispatch(increaseLevel({ level: 0, levelFromTop: h }));
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
        dispatch(increaseLevel({ level: h - 2, levelFromTop: h }));
      } else {
        setCursorPosition({
          top: 1 * letterHeight + 1 * letterHeight * gap,
          left:
            elementRect.left +
            letterWidth * letterIndex +
            letterIndex * (letterWidth / 4),
        });
        dispatch(increaseLevel({ level: h - 1, levelFromTop: h }));
      }
    }
  }, [
    currentWordRef,
    dispatch,
    letterHeight,
    letterIndex,
    letterWidth,
    setCursorPosition,
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
