"use client";

import React from "react";

interface Props {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputHandlers: {
    onInput: React.FormEventHandler<HTMLInputElement>;
    onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
    onFocus: () => void;
    onBlur: () => void;
  };
  isModalOpen: boolean;
  testEnded: boolean;
}

const TypingParagraphInputBox = ({
  inputRef,
  inputHandlers,
  isModalOpen,
  testEnded,
}: Props) => {
  return (
    <input
      type="text"
      ref={inputRef}
      id="main-user-typing-cursor"
      disabled={testEnded || isModalOpen}
      className="absolute inset-0 -z-10 appearance-none border-none bg-transparent text-transparent outline-none select-none"
      onKeyDown={inputHandlers.onKeyDown}
      onInput={inputHandlers.onInput}
      onFocus={inputHandlers.onFocus}
      onBlur={inputHandlers.onBlur}
      autoComplete="off"
      spellCheck={false}
      autoCapitalize="off"
    />
  );
};

export default TypingParagraphInputBox;
