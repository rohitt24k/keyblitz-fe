import { useMutableData } from "@/context/mutableDataProvider";
import { useTypingStore } from "@/lib/store-provider";

export const useResetStates = () => {
  const { resetTest } = useMutableData();
  const toggleResetTrigger = useTypingStore((s) => s.toggleResetTrigger);
  const resetCursors = useTypingStore((s) => s.resetCursors);
  const initWords = useTypingStore((s) => s.initWords);

  const resetStates = () => {
    toggleResetTrigger();
    resetTest();
    resetCursors();
    initWords();
  };

  return { resetStates };
};
