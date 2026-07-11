import level1 from "@/utils/words-list/1.json";
import level2 from "@/utils/words-list/2.json";
import level3 from "@/utils/words-list/3.json";
import level4 from "@/utils/words-list/4.json";
import level5 from "@/utils/words-list/5.json";

const wordsAccordingToLevel = {
  1: level1,
  2: level2,
  3: level3,
  4: level4,
  5: level5,
};

export const getWordsToType = (
  level: 1 | 2 | 3 | 4 | 5,
  numberOfWords: number,
) => {
  const wordsList = wordsAccordingToLevel[level];
  let randomIndex = Math.floor(Math.random() * wordsList.length);

  if (randomIndex + numberOfWords > wordsList.length) {
    randomIndex = randomIndex - 2 * numberOfWords;
  }

  return wordsList
    .slice(randomIndex, randomIndex + numberOfWords)
    .map((w) => w.toLowerCase())
    .join(" ");
};
