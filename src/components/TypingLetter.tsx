import React from "react";

interface Props {
  letter: string;
  error: undefined | number;
}

const TypingLetter = ({ letter, error }: Props) => {
  return (
    <span
      className={`${error === 1 ? "soft-error" : ""} ${
        error === 2 ? "dark-error" : ""
      } ${error === 0 ? "text-foreground" : "text-foreground-light"}`}
    >
      {letter}
    </span>
  );
};

export default TypingLetter;
