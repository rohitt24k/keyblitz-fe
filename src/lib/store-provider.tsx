"use client";

import React, { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import {
  createTypingStore,
  TypingStore,
  TypingStoreApi,
} from "./stores/typing-store";
import {
  createParagraphStore,
  ParagraphStore,
  ParagraphStoreApi,
} from "./stores/paragraph-store";

// ── Typing store ────────────────────────────────────────────────────────────

const TypingStoreContext = createContext<TypingStoreApi | undefined>(undefined);

export function useTypingStore<T>(selector: (store: TypingStore) => T): T {
  const ctx = useContext(TypingStoreContext);
  if (!ctx) throw new Error("useTypingStore must be used within StoreProvider");
  return useStore(ctx, selector);
}

// ── Paragraph store ─────────────────────────────────────────────────────────

const ParagraphStoreContext = createContext<ParagraphStoreApi | undefined>(
  undefined
);

export function useParagraphStore<T>(
  selector: (store: ParagraphStore) => T
): T {
  const ctx = useContext(ParagraphStoreContext);
  if (!ctx)
    throw new Error("useParagraphStore must be used within StoreProvider");
  return useStore(ctx, selector);
}

// ── Combined provider ────────────────────────────────────────────────────────

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const typingRef = useRef<TypingStoreApi>();
  const paragraphRef = useRef<ParagraphStoreApi>();

  if (!typingRef.current) typingRef.current = createTypingStore();
  if (!paragraphRef.current) paragraphRef.current = createParagraphStore();

  return (
    <TypingStoreContext.Provider value={typingRef.current}>
      <ParagraphStoreContext.Provider value={paragraphRef.current}>
        {children}
      </ParagraphStoreContext.Provider>
    </TypingStoreContext.Provider>
  );
}
