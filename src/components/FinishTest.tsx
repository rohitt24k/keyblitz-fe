"use client";

import React from "react";
import Chart from "./Chart";
import { useResetStates } from "@/hooks/useResetStates";
import { useMutableData } from "@/context/mutableDataProvider";
import { calculateTimeDiff } from "@/utils/calculateTimeDiff";
import { Button } from "./ui/button";
import { H2, Muted } from "./ui/typography";
import RestartButton from "./RestartButton";

export default function FinishTest() {
  const {
    testProp: {
      current: {
        totalTimeSpent,
        totalCorrectCharTyped,
        totalCharTyped,
        wpm,
        accuracy,
      },
    },
  } = useMutableData();
  const { resetStates } = useResetStates();

  const { minutes, seconds } = calculateTimeDiff(0, totalTimeSpent);
  const timeLabel = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div className="space-y-4">
      <H2>Results</H2>
      <div className="flex gap-8">
        <div>
          <Muted>WPM</Muted>
          <p className="text-4xl font-bold">{wpm}</p>
        </div>
        <div>
          <Muted>Accuracy</Muted>
          <p className="text-4xl font-bold">{accuracy}%</p>
        </div>
        <div>
          <Muted>Time</Muted>
          <p className="text-4xl font-bold">{timeLabel}</p>
        </div>
        <div>
          <Muted>Characters</Muted>
          <p className="text-4xl font-bold">
            <span className="text-foreground">{totalCorrectCharTyped}</span>
            <span className="text-foreground-light">/{totalCharTyped}</span>
          </p>
        </div>
      </div>
      <div className="h-62.5">
        <Chart />
      </div>
      <div className="mx-auto">
        <RestartButton />
      </div>
    </div>
  );
}
