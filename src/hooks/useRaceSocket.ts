"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientMessage,
  FinalResult,
  LeaderboardEntry,
  PlayerSnapshot,
  RaceStatus,
  ServerMessage,
} from "@/types/race";

function workerUrl(): string {
  return process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";
}

interface UseRaceSocketOptions {
  roomCode: string;
  playerId: string;
  username: string;
  onLeaderboard?: (players: LeaderboardEntry[]) => void;
  onFinished?: (results: FinalResult[]) => void;
}

interface RaceSocketState {
  status: RaceStatus;
  players: PlayerSnapshot[];
  words: string[];
  creatorId: string | null;
  isConnected: boolean;
}

export function useRaceSocket({
  roomCode,
  playerId,
  username,
  onLeaderboard,
  onFinished,
}: UseRaceSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  // Throttle: hold the latest position and flush on a 150ms timer
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<{ wordIndex: number; letterIndex: number } | null>(null);

  const [state, setState] = useState<RaceSocketState>({
    status: "lobby",
    players: [],
    words: [],
    creatorId: null,
    isConnected: false,
  });

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Throttled send: at most one progress message per 150 ms
  const sendProgress = useCallback(
    (wordIndex: number, letterIndex: number) => {
      pendingProgressRef.current = { wordIndex, letterIndex };
      if (throttleTimerRef.current !== null) return;
      throttleTimerRef.current = setTimeout(() => {
        if (pendingProgressRef.current !== null) {
          send({ type: "progress", ...pendingProgressRef.current });
          pendingProgressRef.current = null;
        }
        throttleTimerRef.current = null;
      }, 150);
    },
    [send],
  );

  const startRace = useCallback(() => send({ type: "start" }), [send]);

  useEffect(() => {
    const wsEndpoint =
      workerUrl().replace(/^http/, "ws") + `/api/ws/${roomCode}`;
    const ws = new WebSocket(wsEndpoint);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((s) => ({ ...s, isConnected: true }));
      ws.send(
        JSON.stringify({
          type: "join",
          playerId,
          username,
        } satisfies ClientMessage),
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        switch (msg.type) {
          case "status":
            setState((s) => ({
              ...s,
              status: msg.status,
              players: msg.players,
              creatorId: msg.creatorId,
              words: msg.words ?? s.words,
            }));
            break;
          case "leaderboard":
            onLeaderboard?.(msg.players);
            break;
          case "finished":
            onFinished?.(msg.results);
            break;
          case "error":
            console.error("[RaceSocket] Server error:", msg.message);
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => setState((s) => ({ ...s, isConnected: false }));

    return () => {
      ws.close();
      wsRef.current = null;
      if (throttleTimerRef.current !== null) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
        pendingProgressRef.current = null;
      }
    };
  }, [roomCode, playerId, username, onLeaderboard, onFinished]);

  return { ...state, sendProgress, startRace };
}
