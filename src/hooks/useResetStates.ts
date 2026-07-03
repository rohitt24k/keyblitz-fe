import { useMutableData } from "@/context/mutableDataProvider";
import { resetCursor } from "@/lib/features/ghostCursor/ghostCursor";
import { resetTrigger } from "@/lib/features/typingTests/typingTestsSlice";
import { resetWords } from "@/lib/features/typingWord/typingWordSlice";
import { useAppDispatch } from "@/lib/hooks";

export const useResetStates = () => {
  const dispatch = useAppDispatch();
  const { resetTest } = useMutableData();

  const resetStates = () => {
    dispatch(resetTrigger());
    resetTest();
    dispatch(resetCursor());
    dispatch(resetWords());
  };

  return { resetStates };
};
