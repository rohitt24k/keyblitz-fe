"use client";

import { useTypingStore } from "@/lib/store-provider";
import { calculateTimeDiff } from "@/utils/calculateTimeDiff";
import { calculateWpm } from "@/utils/calculateWPM";
import { createContext, MutableRefObject, useContext, useRef } from "react";

interface IMutableDataContext {
  testProp: MutableRefObject<ITestProp>;
  startTestMethod: () => void;
  endTestMethod: () => void;
  pauseTestMethod: () => void;
  increaseTotalCharTyped: () => void;
  increaseTotalCorrectCharTyped: () => void;
  resetTest: () => void;
  addWordTimeStamp: (obj: { index: number; timeStamp: number }) => void;
  addEachSecondWordTyped: (obj: {
    charTypedCount: number;
    correctCharTypedCount: number;
  }) => void;
  addEachWordError: (obj: { index: number }) => void;
}

interface IMutableDataProvider {
  children: React.ReactNode;
}

const MutableDataContext = createContext<IMutableDataContext | null>(null);

function MutableDataProvider({ children }: IMutableDataProvider) {
  const testProp = useRef<ITestProp>({
    totalTimeSpent: 0,
    startTime: 0,
    endTime: 0,
    eachWordTimeSpent: [],
    secondsCharTyped: [],
    eachWordError: [],
    totalCharTyped: 0,
    totalCorrectCharTyped: 0,
    wpm: -1,
    accuracy: -1,
  });

  const startTest = useTypingStore((s) => s.startTest);
  const endTest = useTypingStore((s) => s.endTest);
  const pauseTest = useTypingStore((s) => s.pauseTest);
  const resetTestFlags = useTypingStore((s) => s.resetTestFlags);

  const startTestMethod = () => {
    testProp.current = { ...testProp.current, startTime: Date.now() };
    startTest();
  };

  const endTestMethod = () => {
    testProp.current.endTime = Date.now();
    const { totalTimeMs } = calculateTimeDiff(
      testProp.current.startTime,
      testProp.current.endTime
    );
    testProp.current.totalTimeSpent += totalTimeMs;

    const { totalCorrectCharTyped, totalCharTyped, totalTimeSpent } =
      testProp.current;
    testProp.current.wpm = calculateWpm(
      totalCorrectCharTyped / 5,
      totalTimeSpent
    );
    testProp.current.accuracy =
      totalCharTyped > 0
        ? Math.round((totalCorrectCharTyped / totalCharTyped) * 100)
        : 0;

    endTest();
  };

  const pauseTestMethod = () => {
    const { totalTimeMs } = calculateTimeDiff(
      testProp.current.startTime,
      Date.now()
    );
    testProp.current.totalTimeSpent += totalTimeMs;
    testProp.current.startTime = 0;
    testProp.current.endTime = 0;
    pauseTest();
  };

  const increaseTotalCharTyped = () => {
    testProp.current.totalCharTyped += 1;
  };

  const increaseTotalCorrectCharTyped = () => {
    testProp.current.totalCorrectCharTyped += 1;
  };

  const resetTest = () => {
    testProp.current = {
      totalTimeSpent: 0,
      startTime: 0,
      endTime: 0,
      eachWordTimeSpent: [],
      secondsCharTyped: [],
      eachWordError: [],
      totalCharTyped: 0,
      totalCorrectCharTyped: 0,
      wpm: -1,
      accuracy: -1,
    };
    resetTestFlags();
  };

  const addWordTimeStamp = ({
    index,
    timeStamp,
  }: {
    index: number;
    timeStamp: number;
  }) => {
    testProp.current.eachWordTimeSpent[index] = timeStamp;
  };

  const addEachSecondWordTyped = ({
    charTypedCount,
    correctCharTypedCount,
  }: {
    charTypedCount: number;
    correctCharTypedCount: number;
  }) => {
    testProp.current.secondsCharTyped.push({
      charTypedCount,
      correctCharTypedCount,
      errorCharTypedCount: charTypedCount - correctCharTypedCount,
    });
  };

  const addEachWordError = ({ index }: { index: number }) => {
    if (testProp.current.eachWordError[index] === undefined) {
      testProp.current.eachWordError[index] = 1;
    } else {
      testProp.current.eachWordError[index]++;
    }
  };

  return (
    <MutableDataContext.Provider
      value={{
        testProp,
        startTestMethod,
        endTestMethod,
        pauseTestMethod,
        increaseTotalCharTyped,
        increaseTotalCorrectCharTyped,
        resetTest,
        addWordTimeStamp,
        addEachSecondWordTyped,
        addEachWordError,
      }}
    >
      {children}
    </MutableDataContext.Provider>
  );
}

export const useMutableData = () => {
  const context = useContext(MutableDataContext);
  if (context == null) {
    throw new Error("useMutableData must be used within MutableDataProvider");
  }
  return context;
};

export default MutableDataProvider;
