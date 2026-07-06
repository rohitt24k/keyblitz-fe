"use client";

import React, { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import {
  createTypingStore,
  TypingStore,
  TypingStoreApi,
} from "./stores/typing-store";

// ── Typing store ────────────────────────────────────────────────────────────

const TypingStoreContext = createContext<TypingStoreApi | undefined>(undefined);

export function useTypingStore<T>(selector: (store: TypingStore) => T): T {
  const ctx = useContext(TypingStoreContext);
  if (!ctx) throw new Error("useTypingStore must be used within StoreProvider");
  return useStore(ctx, selector);
}

// ── Combined provider ────────────────────────────────────────────────────────

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const typingRef = useRef<TypingStoreApi>();

  if (!typingRef.current) typingRef.current = createTypingStore();

  return (
    <TypingStoreContext.Provider value={typingRef.current}>
      {children}
    </TypingStoreContext.Provider>
  );
}
