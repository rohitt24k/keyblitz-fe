"use client";

import FinishTest from "@/components/FinishTest";
import TypingParagraph from "@/components/TypingParagraph";
import { getWordsToType } from "@/actions/getWordsToType";
import { useTypingStore } from "@/lib/store-provider";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

async function createRoom(): Promise<string> {
  const workerUrl =
    process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";
  const res = await fetch(`${workerUrl}/api/room/create`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create room");
  const data = (await res.json()) as { roomCode: string };
  return data.roomCode;
}

export default function Page() {
  const resetTrigger = useTypingStore((s) => s.resetTrigger);
  const [showFinishTest, setShowFinishTest] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const router = useRouter();

  // Regenerate words whenever a restart is triggered
  const words = useMemo(
    () => getWordsToType(1, 50).trim().split(" "),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resetTrigger],
  );

  // Clear finish screen on restart
  useEffect(() => {
    setShowFinishTest(false);
  }, [resetTrigger]);

  async function handleCreateRoom() {
    setCreatingRoom(true);
    try {
      const roomCode = await createRoom();
      router.push(`/race/${roomCode}`);
    } catch (err) {
      console.error(err);
      setCreatingRoom(false);
    }
  }

  return (
    <div>
      {!showFinishTest ? (
        <>
          <TypingParagraph
            words={words}
            onTestEnd={() => {
              setTimeout(() => setShowFinishTest(true), 1000);
            }}
          />
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleCreateRoom}
              disabled={creatingRoom}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {creatingRoom ? "Creating room…" : "Multiplayer race →"}
            </button>
          </div>
        </>
      ) : (
        <FinishTest />
      )}
    </div>
  );
}
