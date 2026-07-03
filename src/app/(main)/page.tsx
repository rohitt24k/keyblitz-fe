"use client";

import FindHeightWidth from "@/components/FindHeightWidth";
import FinishTest from "@/components/FinishTest";
import TypingParagraph from "@/components/TypingParagraph";
import { useAppSelector } from "@/lib/hooks";
import React, { useEffect, useState } from "react";

export default function Page() {
  const { endTest } = useAppSelector((state) => state.typingTests);
  const [showFinishTest, setShowFinishTest] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (endTest) {
      timer = setTimeout(() => {
        setShowFinishTest(true);
      }, 1000);
    } else {
      setShowFinishTest(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [endTest]);

  return (
    <FindHeightWidth>
      {!endTest ? (
        <TypingParagraph />
      ) : showFinishTest ? (
        <FinishTest />
      ) : (
        <div>Loading...</div>
      )}
    </FindHeightWidth>
  );
}
