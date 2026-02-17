"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "yoda-local-votes";

type VoteRecord = Record<string, "YES" | "NO">;

function getSnapshot(): VoteRecord {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let cachedVotes = getSnapshot();

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  cachedVotes = getSnapshot();
  for (const listener of listeners) {
    listener();
  }
}

function getStoreSnapshot() {
  return cachedVotes;
}

function getServerSnapshot(): VoteRecord {
  return {};
}

export function useLocalVotes() {
  const votes = useSyncExternalStore(subscribe, getStoreSnapshot, getServerSnapshot);

  const recordVote = useCallback(
    (marketId: string, vote: "YES" | "NO") => {
      const current = getSnapshot();
      current[marketId] = vote;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      notify();
    },
    []
  );

  const getVote = useCallback(
    (marketId: string): "YES" | "NO" | null => {
      return votes[marketId] ?? null;
    },
    [votes]
  );

  return { votes, recordVote, getVote };
}
