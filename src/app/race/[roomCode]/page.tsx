"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRaceSocket } from "@/hooks/useRaceSocket";
import { useTypingStore } from "@/lib/store-provider";
import { useMutableData } from "@/context/mutableDataProvider";
import RaceLobby from "@/components/RaceLobby";
import Countdown from "@/components/Countdown";
import TypingParagraph from "@/components/TypingParagraph";
import Chart from "@/components/Chart";
import { Button } from "@/components/ui/button";
import { H2, Muted } from "@/components/ui/typography";
import { calculateTimeDiff } from "@/utils/calculateTimeDiff";
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
  const [localFinished, setLocalFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [finalResults, setFinalResults] = useState<FinalResult[] | null>(null);

  const setCursors = useTypingStore((s) => s.setCursors);
  const { testProp } = useMutableData();

  // Stable ref so handleLeaderboard never changes identity (avoids WebSocket reconnects)
  const localFinishedRef = useRef(false);
  useEffect(() => {
    localFinishedRef.current = localFinished;
  }, [localFinished]);

  const handleFinished = useCallback((r: FinalResult[]) => {
    setFinalResults(r);
  }, []);

  const handleLeaderboard = useCallback(
    (entries: LeaderboardEntry[]) => {
      setLeaderboard(entries);
      if (!localFinishedRef.current) {
        setCursors(
          entries
            .filter((e) => e.playerId !== playerId)
            .map((e) => ({
              name: e.username,
              wordIndex: e.wordIndex,
              letterIndex: e.letterIndex,
              wpm: e.wpm,
            })),
        );
      }
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

  // Clear cursors when race starts so GhostCursor's WPM animation never fires
  useEffect(() => {
    if (status === "racing") setCursors([]);
  }, [status, setCursors]);

  // Clear cursors on unmount
  useEffect(() => {
    return () => setCursors([]);
  }, [setCursors]);

  const handleCursorMove = useCallback(
    (wordIndex: number, letterIndex: number) => {
      sendProgress(wordIndex, letterIndex);
    },
    [sendProgress],
  );

  const handleTestEnd = useCallback(() => {
    setLocalFinished(true);
    setCursors([]);
  }, [setCursors]);

  // ── Results screen (shown immediately when local player finishes) ─────────────
  if (localFinished) {
    const { totalTimeSpent, totalCorrectCharTyped, totalCharTyped, wpm, accuracy } =
      testProp.current;
    const { minutes, seconds } = calculateTimeDiff(0, totalTimeSpent);
    const timeLabel = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const sortedLive = [...leaderboard].sort((a, b) => {
      if (b.wordIndex !== a.wordIndex) return b.wordIndex - a.wordIndex;
      return b.letterIndex - a.letterIndex;
    });
    const sortedFinal = finalResults
      ? [...finalResults].sort((a, b) => a.rank - b.rank)
      : null;

    return (
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left: personal stats + chart */}
        <div className="flex-1 min-w-0 space-y-4">
          <H2>Your Results</H2>
          <div className="flex gap-8 flex-wrap">
            <div>
              <Muted>WPM</Muted>
              <p className="text-4xl font-bold">{wpm}</p>
            </div>
            <div>
              <Muted>Accuracy</Muted>
              <p className="text-4xl font-bold">{accuracy}%</p>
            </div>
            <div>
              <Muted>Time</Muted>
              <p className="text-4xl font-bold">{timeLabel}</p>
            </div>
            <div>
              <Muted>Characters</Muted>
              <p className="text-4xl font-bold">
                <span className="text-foreground">{totalCorrectCharTyped}</span>
                <span className="text-foreground-light">/{totalCharTyped}</span>
              </p>
            </div>
          </div>
          <div className="h-[250px]">
            <Chart />
          </div>
        </div>

        {/* Right: leaderboard */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          <H2>Leaderboard</H2>
          <div className="flex flex-col gap-2">
            {sortedFinal
              ? sortedFinal.map((r) => (
                  <div key={r.playerId} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6 text-sm tabular-nums shrink-0">
                      #{r.rank}
                    </span>
                    <span className="flex-1 text-sm truncate">
                      {r.username}
                      {r.playerId === playerId && (
                        <span className="text-muted-foreground"> (you)</span>
                      )}
                    </span>
                    <span className="tabular-nums text-sm font-medium shrink-0">
                      {r.wpm} wpm
                    </span>
                  </div>
                ))
              : sortedLive.map((e, i) => (
                  <div key={e.playerId} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6 text-sm tabular-nums shrink-0">
                      #{i + 1}
                    </span>
                    <span className="flex-1 text-sm truncate">
                      {e.username}
                      {e.playerId === playerId && (
                        <span className="text-muted-foreground"> (you)</span>
                      )}
                    </span>
                    <span className="tabular-nums text-sm font-medium shrink-0">
                      {e.wpm} wpm
                    </span>
                    {e.isFinished ? (
                      <span className="text-xs text-muted-foreground shrink-0">
                        done
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground animate-pulse shrink-0">
                        racing
                      </span>
                    )}
                  </div>
                ))}
          </div>
          <Button
            variant="default"
            className="w-full"
            onClick={() => router.push("/")}
          >
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  // ── Pre-finish screens ───────────────────────────────────────────────────────

  if (!isConnected) {
    return <Muted>Connecting…</Muted>;
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
      onTestEnd={handleTestEnd}
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
