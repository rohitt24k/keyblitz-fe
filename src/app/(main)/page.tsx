"use client";

import FinishTest from "@/components/FinishTest";
import TypingParagraph from "@/components/TypingParagraph";
import { getWordsToType } from "@/actions/getWordsToType";
import { useTypingStore } from "@/lib/store-provider";
import React, { useEffect, useMemo, useState } from "react";

export default function Page() {
  const resetTrigger = useTypingStore((s) => s.resetTrigger);
  const [showFinishTest, setShowFinishTest] = useState(false);

  // Regenerate words whenever a restart is triggered
  const words = useMemo(
    () => getWordsToType(1, 50).trim().split(" "),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resetTrigger],
  );

  // Clear finish screen on restart
  useEffect(() => {
    setShowFinishTest(false);
  }, [resetTrigger]);

  return (
    <div>
      {!showFinishTest ? (
        <TypingParagraph
          words={words}
          onTestEnd={() => {
            setTimeout(() => setShowFinishTest(true), 1000);
          }}
        />
      ) : (
        <FinishTest />
      )}
    </div>
  );
}
