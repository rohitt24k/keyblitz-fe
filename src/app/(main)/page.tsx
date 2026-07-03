"use client";

import FindHeightWidth from "@/components/FindHeightWidth";
import FinishTest from "@/components/FinishTest";
import TypingParagraph from "@/components/TypingParagraph";
import { useTypingStore } from "@/lib/store-provider";
import React, { useEffect, useState } from "react";

export default function Page() {
  const testEnded = useTypingStore((s) => s.testEnded);
  const [showFinishTest, setShowFinishTest] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (testEnded) {
      timer = setTimeout(() => setShowFinishTest(true), 1000);
    } else {
      setShowFinishTest(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [testEnded]);

  return (
    <FindHeightWidth>
      {!testEnded ? (
        <TypingParagraph />
      ) : showFinishTest ? (
        <FinishTest />
      ) : (
        <div>Loading...</div>
      )}
    </FindHeightWidth>
  );
}
