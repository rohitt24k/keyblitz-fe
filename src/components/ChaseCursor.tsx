"use client";

import React, { useState } from "react";
import { useTypingStore } from "@/lib/store-provider";
import { Input } from "@/components/ui/input";
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
  <div className="hover:shadow-border flex items-center gap-2 rounded-xl shadow-[inset_0_0_0_1px] shadow-transparent">
    <div className="border-border mx-4 flex flex-1 justify-between border-b py-4">
      <p>{cursor.name}</p>
      <div className="flex items-center gap-4">
        <div className="border-border border-l pl-4">
          <p>{cursor.wpm}</p>
        </div>
        <div
          className="border-border text-foreground-light cursor-pointer border-l pl-4"
          onClick={onDelete}
        >
          <Close className="h-4 w-4" />
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
  <div className="hover:shadow-border flex items-center gap-2 rounded-xl shadow-[inset_0_0_0_1px] shadow-transparent">
    <div className="border-border mx-4 flex flex-1 justify-between border-b py-4">
      <Input
        type="text"
        className="h-auto w-full rounded-none border-0 bg-transparent py-0 pr-4 shadow-none focus-visible:ring-0"
        placeholder="Enter the cursor name"
        value={newCursor.name}
        onChange={(e) => onChange({ ...newCursor, name: e.target.value })}
      />
      <div className="flex items-center gap-4">
        <div className="border-border border-r border-l px-4">
          <Input
            type="number"
            min={1}
            max={150}
            value={newCursor.wpm || ""}
            onChange={(e) =>
              onChange({ ...newCursor, wpm: Number(e.target.value) })
            }
            className="h-auto w-10 rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            placeholder="WPM"
          />
        </div>
        <div
          className="text-foreground-light rotate-45 cursor-pointer self-center"
          onClick={onAdd}
        >
          <Close className="h-4 w-4" />
        </div>
      </div>
    </div>
  </div>
);

export const ChaseCursor: React.FC = () => {
  const cursors = useTypingStore((s) => s.cursors);
  const setCursors = useTypingStore((s) => s.setCursors);
  const [newCursor, setNewCursor] = useState<NewCursor>({ name: "", wpm: 0 });

  const handleAddCursor = () => {
    if (newCursor.name && newCursor.wpm > 0) {
      setCursors([...cursors, { ...newCursor, letterIndex: 0, wordIndex: 0 }]);
      setNewCursor({ name: "", wpm: 0 });
    }
  };

  const handleDeleteCursor = (index: number) => {
    setCursors(cursors.filter((_, i) => i !== index));
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
