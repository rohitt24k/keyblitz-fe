import words1 from "../src/utils/words-list/1.json";
import words2 from "../src/utils/words-list/2.json";
import words3 from "../src/utils/words-list/3.json";
import words4 from "../src/utils/words-list/4.json";
import words5 from "../src/utils/words-list/5.json";

const ALL_WORDS: string[] = [
  ...(words1 as string[]),
  ...(words2 as string[]),
  ...(words3 as string[]),
  ...(words4 as string[]),
  ...(words5 as string[]),
];

export function getPassage(count = 50): string[] {
  const start = Math.floor(Math.random() * (ALL_WORDS.length - count));
  return ALL_WORDS.slice(start, start + count).map((w) => w.toLowerCase());
}
