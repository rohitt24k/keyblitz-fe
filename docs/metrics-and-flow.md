# Metrics & Data Flow

How keystroke data flows from typing → storage → chart/results, and what the formulas actually do.

---

## 1. Two parallel tracking systems

The app intentionally splits state into two systems to avoid re-render overhead during typing:

| System                  | Location                              | What it holds                                                                                                             |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Zustand stores**      | `src/lib/stores/`                     | UI state — word array, current word/letter index, test lifecycle flags, ghost cursor positions                            |
| **MutableDataProvider** | `src/context/mutableDataProvider.tsx` | Test metrics — timing, character counts, per-second snapshots, per-word errors (all in a `useRef`, never causes a render) |

---

## 2. Data collected during a test

All metric data lives in `testProp.current` (type `ITestProp`, defined in `src/types/index.d.ts`).

```
ITestProp {
  startTime              — Date.now() when the first key is typed (or test resumed after pause)
  endTime                — Date.now() when the final word's space is pressed
  totalTimeSpent         — cumulative ms across all play intervals (handles pauses correctly)

  totalCharTyped         — every keystroke counted (correct + wrong), plus 1 per space pressed
  totalCorrectCharTyped  — correct keystrokes + 1 per space (only when the word was typed perfectly)

  secondsCharTyped[]     — per-second snapshots: { charTypedCount, correctCharTypedCount, errorCharTypedCount }
  eachWordTimeSpent[]    — timestamp (Date.now()) at the moment Space was pressed on each word
  eachWordError[]        — cumulative wrong-keystroke count per word index (collected, not yet displayed)

  wpm                    — net WPM computed on test end
  accuracy               — accuracy % computed on test end
}
```

---

## 3. How data is written during typing

**Source file:** `src/components/TypingParagraphInputBox.tsx`

### On every non-space keystroke (`onInput`, when `keyInput !== null && keyInput !== " "`)

Inside `checkForError()`:

```
if (typedChar === correctWord[letterIndex])
    increaseTotalCorrectCharTyped()    → testProp.totalCorrectCharTyped++
    correctCharTypedCount.current++    → local ref (reset every second)
    increaseTotalCharTyped()           → testProp.totalCharTyped++
    charTypedCount.current++           → local ref (reset every second)
else
    increaseTotalCharTyped()           → testProp.totalCharTyped++
    charTypedCount.current++           → local ref
    addEachWordError({ index })        → testProp.eachWordError[wordIndex]++
```

**Extra characters** (typing past the end of a word) are silently discarded — the input is truncated and no counter is incremented.

### On space keystroke

The typed word is compared against `correctWordArr[wordIndex]` by slicing the trailing space off `inputElement.value`. This check happens synchronously against the DOM value — it does not depend on Zustand state having updated, so it is always accurate even at high typing speeds.

```
typedWord    = inputElement.value.slice(0, -1)   // strip trailing space
wordIsCorrect = typedWord === correctWordArr[wordIndex]

increaseTotalCharTyped()           → always (space is one typed character)
charTypedCount.current++           → always

if (wordIsCorrect)
    increaseTotalCorrectCharTyped()
    correctCharTypedCount.current++
```

### Every 1000 ms while the test runs

A `setInterval` fires and pushes a snapshot into `testProp.secondsCharTyped[]`, then resets the local counters:

```
addEachSecondWordTyped({
  charTypedCount: charTypedCount.current,
  correctCharTypedCount: correctCharTypedCount.current,
})
charTypedCount.current = 0
correctCharTypedCount.current = 0
```

The interval only runs while `testStarted && !testEnded && !testPaused` (Zustand flags). When the test is paused the interval stops, so paused seconds are not recorded as zero-WPM entries.

---

## 4. Time tracking

**Source file:** `src/context/mutableDataProvider.tsx`

The test correctly handles pauses by accumulating elapsed time in segments:

```
startTestMethod()
    testProp.startTime = Date.now()
    Zustand: testStarted = true, testPaused = false

pauseTestMethod()
    totalTimeSpent += (Date.now() - startTime)
    startTime = 0
    Zustand: testPaused = true  ← stops the per-second interval

endTestMethod()
    endTime = Date.now()
    totalTimeSpent += (endTime - startTime)   ← accumulates final segment
    wpm, accuracy computed (see §5)
    Zustand: testEnded = true
```

When the user refocuses after a pause, typing any character triggers `startTestMethod()` again (because `testPaused !== false` in the input handler), which resets `startTime = Date.now()` and resumes the interval.

`calculateTimeDiff(startTime, endTime)` in `src/utils/calculateTimeDiff.ts` simply returns `endTime - startTime` and decomposes it into minutes / seconds / milliseconds.

---

## 5. WPM and accuracy formulas

**Source file:** `src/utils/calculateWPM.ts`

```ts
function calculateWpm(numberOfWords: number, timeInMs: number): number {
  const minutes = timeInMs / 60000;
  return Math.round(numberOfWords / minutes);
}
```

The industry-standard convention is used: **1 word = 5 characters**. The caller divides character count by 5 before passing it in.

### Final WPM (net)

Computed at the end of `endTestMethod()`:

```
wpm = calculateWpm(totalCorrectCharTyped / 5, totalTimeSpent)
    = Math.round((totalCorrectCharTyped / 5) / (totalTimeSpent / 60000))
    = Math.round(totalCorrectCharTyped × 12 / totalTimeSpent_in_min)
```

Only correctly typed characters (including spaces between correctly-typed words) count toward WPM. Wrong characters are excluded.

### Accuracy

```
accuracy = Math.round((totalCorrectCharTyped / totalCharTyped) × 100)
```

`totalCharTyped` counts every keystroke the user made (correct, wrong, and space). `totalCorrectCharTyped` counts only the characters and spaces that were correct. A space is counted as correct only when the entire preceding word was typed without error.

---

## 6. Chart WPM (per-second)

**Source file:** `src/components/Chart.tsx`

Each `secondsCharTyped` entry represents one second of typing. The chart converts it to WPM:

```
wpm    = calculateWpm(correctCharTypedCount / 5, 1000)
rawWPM = calculateWpm(charTypedCount / 5, 1000)
```

Expanding:

```
minutes = 1000 / 60000 = 1/60
wpm     = (correctCharTypedCount / 5) ÷ (1/60) = correctCharTypedCount × 12
```

So 5 correct characters (including spaces) typed in 1 second → 60 WPM. This matches the final WPM formula, since both use the same 5-char-per-word convention and both now consistently include spaces.

The per-second values are then smoothed with an **exponential moving average** (α = 0.2) before rendering:

```
smoothed[i] = 0.2 × raw[i] + 0.8 × smoothed[i-1]
```

This suppresses spikes from momentary bursts of fast or slow typing.

---

## 7. Full flow

```
User presses a key
      │
      ▼
TypingParagraphInputBox.onInput
      │
      ├── Space?
      │     ├── compare inputElement.value (minus trailing space) to correctWordArr[wordIndex]
      │     ├── totalCharTyped++, charTypedCount.current++       (always)
      │     ├── totalCorrectCharTyped++, correctCharTypedCount++ (only if word was correct)
      │     ├── start / end test if needed (MutableDataProvider)
      │     ├── addWordTimeStamp()
      │     └── Zustand: wordIndex++, letterIndex = 0
      │
      └── Letter?
            ├── start / resume test (MutableDataProvider + Zustand)
            └── checkForError()
                  ├── correct char?
                  │     ├── totalCorrectCharTyped++, correctCharTypedCount.current++
                  │     └── totalCharTyped++, charTypedCount.current++
                  └── wrong char?
                        ├── totalCharTyped++, charTypedCount.current++
                        └── eachWordError[wordIndex]++

Every 1000ms (setInterval, runs only while testStarted && !testPaused && !testEnded)
      └── push { charTypedCount.current, correctCharTypedCount.current, errorCharTypedCount }
            into testProp.secondsCharTyped[]
            reset both .current counters to 0

User blurs (loses focus mid-test)
      └── pauseTestMethod()
            ├── totalTimeSpent += (Date.now() - startTime)
            ├── startTime = 0
            └── Zustand: testPaused = true  ← stops the interval

User refocuses and types
      └── testPaused !== false → startTestMethod()
            ├── testProp.startTime = Date.now()
            └── Zustand: testStarted = true, testPaused = false  ← restarts interval

Last word + space pressed
      └── endTestMethod()
            ├── totalTimeSpent += (Date.now() - startTime)
            ├── wpm      = Math.round((totalCorrectCharTyped / 5) / (totalTimeSpent / 60000))
            ├── accuracy = Math.round((totalCorrectCharTyped / totalCharTyped) × 100)
            └── Zustand: testEnded = true
                  └── page.tsx detects testEnded → after 1s → renders FinishTest

FinishTest mounts
      └── reads testProp.current directly (no Zustand)
            ├── displays wpm, accuracy, time (formatted), correct/total chars
            └── Chart reads secondsCharTyped[]
                  ├── converts each entry: wpm = correctCharCount × 12
                  ├── smooths with EMA (α = 0.2)
                  └── renders WPM line, Raw WPM line, error scatter
```

---

## 8. Metric reference

| Metric             | Formula                                                              |
| ------------------ | -------------------------------------------------------------------- |
| Net WPM (final)    | `Math.round((totalCorrectCharTyped / 5) / (totalTimeSpent / 60000))` |
| Accuracy           | `Math.round((totalCorrectCharTyped / totalCharTyped) × 100)`         |
| Per-second WPM     | `correctCharTypedCount × 12` (where count includes spaces)           |
| Per-second Raw WPM | `charTypedCount × 12` (where count includes spaces)                  |

Space between words counts as 1 character in all of the above, consistent with the 5-char-per-word standard (a 4-letter word + its trailing space = 5 chars = 1 word). A space is counted as correct only when the entire preceding word was typed without error.

---

## 9. Data collected but not yet displayed

`eachWordError[]` — cumulative wrong-keystroke count per word index — is populated during typing but not currently shown in the results screen or chart. It could be used to highlight which words the user struggled with.
