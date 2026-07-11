"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRaceSocket } from "@/hooks/useRaceSocket";
import { useTypingStore } from "@/lib/store-provider";
import RaceLobby from "@/components/RaceLobby";
import Countdown from "@/components/Countdown";
import TypingParagraph from "@/components/TypingParagraph";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import type { FinalResult, LeaderboardEntry } from "@/types/race";

const PLAYER_ID_KEY = "kb_playerId";
const USERNAME_KEY = "kb_username";

function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

// Rendered once identity is confirmed — contains the WebSocket hook
function RaceRoom({
  roomCode,
  playerId,
  username,
}: {
  roomCode: string;
  playerId: string;
  username: string;
}) {
  const router = useRouter();
  const [results, setResults] = useState<FinalResult[] | null>(null);

  const setCursors = useTypingStore((s) => s.setCursors);

  const handleFinished = useCallback((r: FinalResult[]) => {
    setResults(r);
  }, []);

  const handleLeaderboard = useCallback(
    (entries: LeaderboardEntry[]) => {
      const newCursors = entries
        .filter((e) => e.playerId !== playerId)
        .map((e) => ({
          name: e.username,
          wordIndex: e.wordIndex,
          letterIndex: e.letterIndex,
          wpm: e.wpm,
        }));
      setCursors(newCursors);
    },
    [playerId, setCursors],
  );

  const { status, players, words, creatorId, isConnected, startRace, sendProgress } =
    useRaceSocket({
      roomCode,
      playerId,
      username,
      onFinished: handleFinished,
      onLeaderboard: handleLeaderboard,
    });

  // When the race starts, clear any leftover cursors from solo mode so that
  // GhostCursor's WPM-based animation doesn't start before server positions arrive.
  useEffect(() => {
    if (status === "racing") {
      setCursors([]);
    }
  }, [status, setCursors]);

  // Clear cursors when the race room unmounts
  useEffect(() => {
    return () => setCursors([]);
  }, [setCursors]);

  const handleCursorMove = useCallback(
    (wordIndex: number, letterIndex: number) => {
      sendProgress(wordIndex, letterIndex);
    },
    [sendProgress],
  );

  if (!isConnected) {
    return <Muted>Connecting…</Muted>;
  }

  if (results) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold">Race Results</h2>
        <ol className="flex flex-col gap-3">
          {results.map((r) => (
            <li key={r.playerId} className="flex items-center gap-4">
              <span className="w-6 font-bold text-muted-foreground">
                #{r.rank}
              </span>
              <span className="flex-1 text-foreground">{r.username}</span>
              <span className="tabular-nums text-foreground">{r.wpm} WPM</span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(r.accuracy)}%
              </span>
            </li>
          ))}
        </ol>
        <Button
          variant="default"
          className="self-start"
          onClick={() => router.push("/")}
        >
          Back to home
        </Button>
      </div>
    );
  }

  if (status === "lobby") {
    return (
      <RaceLobby
        players={players}
        myPlayerId={playerId}
        creatorId={creatorId}
        roomCode={roomCode}
        onStart={startRace}
      />
    );
  }

  if (status === "countdown") {
    return <Countdown seconds={5} />;
  }

  // status === "racing"
  if (words.length === 0) {
    return <Muted>Loading passage…</Muted>;
  }

  return (
    <TypingParagraph
      words={words}
      onCursorMove={handleCursorMove}
    />
  );
}

function UsernamePrompt({ onSet }: { onSet: (username: string) => void }) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    localStorage.setItem(USERNAME_KEY, trimmed);
    onSet(trimmed);
  }

  return (
    <div className="flex flex-col gap-4 max-w-sm mt-16">
      <h2 className="text-2xl font-semibold">Enter your username</h2>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="username"
        maxLength={20}
        className="rounded-md bg-accent px-4 py-3 text-lg text-foreground outline-none focus:ring-2 focus:ring-primary"
        autoFocus
      />
      <Button variant="primary" onClick={submit} className="self-start">
        Join Room
      </Button>
    </div>
  );
}

export default function RacePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [playerId, setPlayerId] = useState("");
  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const pid = getOrCreatePlayerId();
    const stored = localStorage.getItem(USERNAME_KEY);
    setPlayerId(pid);
    if (stored) {
      setUsername(stored);
      setReady(true);
    }
  }, []);

  if (!ready || !playerId) {
    return (
      <UsernamePrompt
        onSet={(u) => {
          setUsername(u);
          setReady(true);
        }}
      />
    );
  }

  return (
    <RaceRoom roomCode={roomCode} playerId={playerId} username={username} />
  );
}
