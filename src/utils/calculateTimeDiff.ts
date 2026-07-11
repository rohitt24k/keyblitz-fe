export function calculateTimeDiff(
  startTime: number,
  endTime: number,
): {
  totalTimeMs: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
} {
  const totalTimeMs = endTime - startTime;
  const minutes = Math.floor((totalTimeMs % 3600000) / 60000);
  const seconds = Math.floor((totalTimeMs % 60000) / 1000);
  const milliseconds = totalTimeMs % 1000;
  return { totalTimeMs, minutes, seconds, milliseconds };
}
