import type { PuzzleMode } from "./board";

export type DayProgress = {
  date: string;
  foundKeys: string[];
  startedAt: number | null;
  elapsedMs: number | null;
  hints: number;
  wrongs: number;
};

export type SavedState = {
  v: 2;
  streak: number;
  lastWinDate: string | null;
  best: Record<PuzzleMode, number | null>;
  seenHowTo: boolean;
  // One-way v2.5 easter-egg flag: set by a clean daily-Blorble solve, never cleared.
  blorblestUnlocked: boolean;
  lastMode: PuzzleMode;
  days: Record<PuzzleMode, DayProgress | null>;
};

// lastMode "blorblet": with nothing stored, boot lands on the Blorblet fresh
// daily (v2.2 §1 — "last-played mode if stored, else Blorblet").
export const initialState = (): SavedState => ({
  v: 2, streak: 0, lastWinDate: null, best: { blorble: null, blorblet: null, blorblest: null },
  seenHowTo: false, blorblestUnlocked: false, lastMode: "blorblet",
  days: { blorble: null, blorblet: null, blorblest: null },
});

const DAY_MS = 86_400_000;
const daysBetween = (aIso: string, bIso: string): number =>
  Math.round((Date.parse(`${bIso}T00:00:00Z`) - Date.parse(`${aIso}T00:00:00Z`)) / DAY_MS);

// Called when a daily's last Set is found. Streak moves at most once per day;
// per-mode best/elapsed always record. Same-mode same-day repeats are no-ops.
// Blorblest is self-contained: it records best/day but NEVER moves the streak.
export const recordWin = (s: SavedState, mode: PuzzleMode, dateIso: string, elapsedMs: number): SavedState => {
  if (s.days[mode]?.date === dateIso && s.days[mode]?.elapsedMs != null) return s;
  const best = s.best[mode];
  return {
    ...s,
    streak: mode === "blorblest" || s.lastWinDate === dateIso ? s.streak
      : s.lastWinDate !== null && daysBetween(s.lastWinDate, dateIso) === 1 ? s.streak + 1 : 1,
    lastWinDate: mode === "blorblest" ? s.lastWinDate : dateIso,
    best: { ...s.best, [mode]: best === null ? elapsedMs : Math.min(best, elapsedMs) },
    days: {
      ...s.days,
      [mode]: {
        ...(s.days[mode] ?? { date: dateIso, foundKeys: [], startedAt: null, hints: 0, wrongs: 0 }),
        date: dateIso,
        elapsedMs,
      },
    },
  };
};

export const freshDay = (s: SavedState, dateIso: string): SavedState => ({
  ...s,
  days: {
    blorble: s.days.blorble?.date === dateIso ? s.days.blorble : null,
    blorblet: s.days.blorblet?.date === dateIso ? s.days.blorblet : null,
    blorblest: s.days.blorblest?.date === dateIso ? s.days.blorblest : null,
  },
});

const KEY = "blorble.v1";

type V1State = {
  v: 1; streak: number; lastWinDate: string | null; bestMs: number | null; seenHowTo: boolean;
  day: { date: string; foundKeys: string[]; startedAt: number | null; elapsedMs: number | null } | null;
};

export const load = (storage: Pick<Storage, "getItem">): SavedState => {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as SavedState | V1State;
    // Top-level spread heals new fields, but it's SHALLOW — best/days from an
    // older save would lack the blorblest key at runtime, so heal them too.
    if (parsed.v === 2) {
      const base = initialState();
      return { ...base, ...parsed, best: { ...base.best, ...parsed.best }, days: { ...base.days, ...parsed.days } };
    }
    if (parsed.v === 1)
      return {
        ...initialState(),
        streak: parsed.streak,
        lastWinDate: parsed.lastWinDate,
        best: { blorble: parsed.bestMs, blorblet: null, blorblest: null },
        seenHowTo: parsed.seenHowTo,
        days: { blorble: parsed.day ? { ...parsed.day, hints: 0, wrongs: 0 } : null, blorblet: null, blorblest: null },
      };
    return initialState();
  } catch {
    return initialState();
  }
};

export const save = (storage: Pick<Storage, "setItem">, s: SavedState): void => {
  try { storage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode / quota */ }
};
