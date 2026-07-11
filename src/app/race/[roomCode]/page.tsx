"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRaceSocket } from "@/hooks/useRaceSocket";
import RaceLobby from "@/components/RaceLobby";
import Countdown from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import type { FinalResult } from "@/types/race";

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

  const handleFinished = useCallback((r: FinalResult[]) => setResults(r), []);

  const { status, players, text, creatorId, isConnected, startRace } =
    useRaceSocket({
      roomCode,
      playerId,
      username,
      onFinished: handleFinished,
    });

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
              <span className="tabular-nums text-foreground">
                {r.wpm} WPM
              </span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(r.accuracy)}%
              </span>
            </li>
          ))}
        </ol>
        <Button variant="default" className="self-start" onClick={() => router.push("/")}>
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

  // status === "racing" — TypingParagraph wired in Phase 2
  return (
    <div className="flex flex-col gap-6">
      <Muted>Race in progress — full typing UI coming in Phase 2.</Muted>
      <p className="text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

// Username prompt shown on first visit
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

  // Load stored identity on first render (client-only)
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

  return <RaceRoom roomCode={roomCode} playerId={playerId} username={username} />;
}
