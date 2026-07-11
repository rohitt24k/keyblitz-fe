export interface ITestProp {
  totalTimeSpent: number;
  startTime: number;
  endTime: number;
  eachWordTimeSpent: number[];
  secondsCharTyped: {
    charTypedCount: number;
    correctCharTypedCount: number;
    errorCharTypedCount: number;
  }[];
  eachWordError: number[];
  totalCharTyped: number;
  totalCorrectCharTyped: number;
  wpm: number;
  accuracy: number;
}
