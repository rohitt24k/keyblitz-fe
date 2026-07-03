"use client";

import { setLetterHeightWidth } from "@/lib/features/typingParagraphProp/typingParagraphProp";
import { setInitialWords } from "@/lib/features/typingWord/typingWordSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import React, { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
}

const FindHeightWidth = ({ children }: Props) => {
  const divRef = useRef<HTMLDivElement>(null);
  const { height } = useAppSelector((state) => state.typingParagraphProp);
  const dispatch = useAppDispatch();

  function measureLetterDimensions(
    divRef: React.RefObject<HTMLDivElement>
  ): Promise<{ height: number; width: number }> {
    return document.fonts.ready.then(() => {
      const divElem = document.createElement("div");
      const spanElem = document.createElement("span");
      spanElem.innerText = "W";
      divElem.appendChild(spanElem);
      divElem.classList.add("flex");
      spanElem.classList.add("text-pa");
      divRef.current?.appendChild(divElem);

      const rect = spanElem.getBoundingClientRect();
      const width = Number(rect.width.toFixed(2));
      const height = Number(rect.height.toFixed(2));

      divRef.current?.removeChild(divElem);
      return { width, height };
    });
  }

  useEffect(() => {
    measureLetterDimensions(divRef).then((data) => {
      dispatch(setLetterHeightWidth({ height: data.height, width: data.width }));
    });
    dispatch(setInitialWords());
  }, [dispatch]);

  return <div ref={divRef}>{height !== 0 ? children : "Loading..."}</div>;
};

export default FindHeightWidth;
