"use client";

import React from "react";
import Chart from "./Chart";
import { useResetStates } from "@/hooks/useResetStates";
import { useMutableData } from "@/context/mutableDataProvider";
import { Button } from "./ui/button";
import { H2, Muted } from "./ui/typography";

export default function FinishTest() {
  const {
    testProp: {
      current: { totalTimeSpent, totalCorrectCharTyped, totalCharTyped },
    },
  } = useMutableData();
  const { resetStates } = useResetStates();

  return (
    <div className="space-y-4">
      <H2>Results</H2>
      <div className="space-y-1">
        <Muted>Time Spent: {totalTimeSpent}ms</Muted>
        <Muted>Correct Characters: {totalCorrectCharTyped}</Muted>
        <Muted>Total Characters: {totalCharTyped}</Muted>
      </div>
      <div className="h-[250px]">
        <Chart />
      </div>
      <Button onClick={resetStates}>Restart</Button>
    </div>
  );
}
