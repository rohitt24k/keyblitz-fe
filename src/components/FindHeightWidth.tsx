"use client";

import { useTypingStore } from "@/lib/store-provider";
import React, { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
}

function measureLetterDimensions(
  divRef: React.RefObject<HTMLDivElement>,
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
    const w = Number(rect.width.toFixed(2));
    const h = Number(rect.height.toFixed(2));

    divRef.current?.removeChild(divElem);
    return { width: w, height: h };
  });
}

const FindHeightWidth = ({ children }: Props) => {
  const divRef = useRef<HTMLDivElement>(null);
  const letterHeight = useTypingStore((s) => s.letterHeight);
  const setLetterSize = useTypingStore((s) => s.setLetterSize);
  const initWords = useTypingStore((s) => s.initWords);

  useEffect(() => {
    measureLetterDimensions(divRef).then((data) => {
      setLetterSize(data.height, data.width);
    });
    initWords();
  }, [setLetterSize, initWords]);

  return <div ref={divRef}>{letterHeight !== 0 ? children : "Loading..."}</div>;
};

export default FindHeightWidth;
