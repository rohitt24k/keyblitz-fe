"use client";

import React, { useCallback, useEffect } from "react";

interface KeyboardInputHandlerProps {
  children: React.ReactNode;
  handleFocus: () => void;
  inputIsFocused: boolean;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const KeyboardInputHandler: React.FC<KeyboardInputHandlerProps> = ({
  children,
  handleFocus,
  inputIsFocused,
  isModalOpen,
  setIsModalOpen,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          setIsModalOpen(true);
          break;
        case "Tab":
          break;
        case "Enter":
          break;
        default:
          e.preventDefault();
          handleFocus();
          break;
      }
    },
    [handleFocus, setIsModalOpen],
  );

  useEffect(() => {
    const shouldAddListener = !inputIsFocused && !isModalOpen;

    if (shouldAddListener) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [inputIsFocused, isModalOpen, handleKeyDown]);

  return <>{children}</>;
};

export default KeyboardInputHandler;
