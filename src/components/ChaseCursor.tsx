"use client";

import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setCursors } from "@/lib/features/ghostCursor/ghostCursor";
import Close from "@/images/close.svg";

interface Cursor {
  name: string;
  wpm: number;
  letterIndex: number;
  wordIndex: number;
}

interface NewCursor {
  name: string;
  wpm: number;
}

const CursorItem: React.FC<{ cursor: Cursor; onDelete: () => void }> = ({
  cursor,
  onDelete,
}) => (
  <div className="flex gap-2 items-center shadow-[inset_0_0_0_1px] shadow-transparent hover:shadow-border rounded-xl">
    <div className="flex-1 flex justify-between border-b border-border py-4 mx-4">
      <p>{cursor.name}</p>
      <div className="flex gap-4 items-center">
        <div className="border-l border-border pl-4">
          <p>{cursor.wpm}</p>
        </div>
        <div
          className="border-l border-border text-foreground-light pl-4 cursor-pointer"
          onClick={onDelete}
        >
          <Close className="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
);

const NewCursorInput: React.FC<{
  newCursor: NewCursor;
  onChange: (cursor: NewCursor) => void;
  onAdd: () => void;
}> = ({ newCursor, onChange, onAdd }) => (
  <div className="flex gap-2 items-center shadow-[inset_0_0_0_1px] shadow-transparent hover:shadow-border rounded-xl">
    <div className="flex-1 flex justify-between border-b border-border py-4 mx-4">
      <input
        type="text"
        className="w-full pr-4 bg-transparent outline-none"
        placeholder="Enter the cursor name"
        value={newCursor.name}
        onChange={(e) => onChange({ ...newCursor, name: e.target.value })}
      />
      <div className="flex gap-4 items-center">
        <div className="border-l border-r border-border px-4">
          <input
            type="number"
            min={1}
            max={150}
            value={newCursor.wpm || ""}
            onChange={(e) =>
              onChange({ ...newCursor, wpm: Number(e.target.value) })
            }
            className="w-10 bg-transparent outline-none"
            placeholder="WPM"
          />
        </div>
        <div
          className="self-center rotate-45 text-foreground-light cursor-pointer"
          onClick={onAdd}
        >
          <Close className="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
);

export const ChaseCursor: React.FC = () => {
  const { cursors } = useAppSelector((state) => state.ghostCursor);
  const [newCursor, setNewCursor] = useState<NewCursor>({ name: "", wpm: 0 });
  const dispatch = useAppDispatch();

  const handleAddCursor = () => {
    if (newCursor.name && newCursor.wpm > 0) {
      dispatch(
        setCursors({
          cursors: [
            ...cursors,
            { ...newCursor, letterIndex: 0, wordIndex: 0 },
          ],
        })
      );
      setNewCursor({ name: "", wpm: 0 });
    }
  };

  const handleDeleteCursor = (index: number) => {
    dispatch(
      setCursors({
        cursors: cursors.filter((_, i) => i !== index),
      })
    );
  };

  return (
    <div className="p-4">
      <div className="flex flex-col space-y-2">
        {cursors.map((cursor, i) => (
          <CursorItem
            key={i}
            cursor={cursor}
            onDelete={() => handleDeleteCursor(i)}
          />
        ))}
        <NewCursorInput
          newCursor={newCursor}
          onChange={setNewCursor}
          onAdd={handleAddCursor}
        />
      </div>
    </div>
  );
};

export default ChaseCursor;
