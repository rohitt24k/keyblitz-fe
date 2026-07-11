export interface typingLetterError {
  error: boolean;
  letterError: number[];
}

export interface wordProp {
  word: string;
  typedWord: string;
  error: null | typingLetterError;
}
