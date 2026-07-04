export function calculateWpm(numberOfWords: number, timeInMs: number) {
  const minutes = timeInMs / 60000;
  return Math.round(numberOfWords / minutes);
}
