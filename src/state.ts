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
  lastMode: PuzzleMode;
  days: Record<PuzzleMode, DayProgress | null>;
};

export const initialState = (): SavedState => ({
  v: 2, streak: 0, lastWinDate: null, best: { blorble: null, blorblet: null },
  seenHowTo: false, lastMode: "blorble", days: { blorble: null, blorblet: null },
});

const DAY_MS = 86_400_000;
const daysBetween = (aIso: string, bIso: string): number =>
  Math.round((Date.parse(`${bIso}T00:00:00Z`) - Date.parse(`${aIso}T00:00:00Z`)) / DAY_MS);

// Called when a daily's last Set is found. Streak moves at most once per day;
// per-mode best/elapsed always record. Same-mode same-day repeats are no-ops.
export const recordWin = (s: SavedState, mode: PuzzleMode, dateIso: string, elapsedMs: number): SavedState => {
  if (s.days[mode]?.date === dateIso && s.days[mode]?.elapsedMs != null) return s;
  const best = s.best[mode];
  return {
    ...s,
    streak: s.lastWinDate === dateIso ? s.streak
      : s.lastWinDate !== null && daysBetween(s.lastWinDate, dateIso) === 1 ? s.streak + 1 : 1,
    lastWinDate: dateIso,
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
    if (parsed.v === 2) return { ...initialState(), ...parsed };
    if (parsed.v === 1)
      return {
        ...initialState(),
        streak: parsed.streak,
        lastWinDate: parsed.lastWinDate,
        best: { blorble: parsed.bestMs, blorblet: null },
        seenHowTo: parsed.seenHowTo,
        days: { blorble: parsed.day ? { ...parsed.day, hints: 0, wrongs: 0 } : null, blorblet: null },
      };
    return initialState();
  } catch {
    return initialState();
  }
};

export const save = (storage: Pick<Storage, "setItem">, s: SavedState): void => {
  try { storage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode / quota */ }
};
