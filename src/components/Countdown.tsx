"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  seconds?: number;
  onComplete?: () => void;
}

export default function Countdown({ seconds = 5, onComplete }: CountdownProps) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="flex h-64 items-center justify-center">
      <span className="text-foreground text-8xl font-extrabold tabular-nums">
        {count > 0 ? count : "GO!"}
      </span>
    </div>
  );
}
