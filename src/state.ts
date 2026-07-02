export type DayProgress = {
  date: string;              // ISO date this progress belongs to
  foundKeys: string[];       // found Sets as "i-j-k" board-index keys
  startedAt: number | null;  // epoch ms when the board was revealed
  elapsedMs: number | null;  // final time, set on win
};

export type SavedState = {
  v: 1;
  streak: number;              // consecutive completed dailies
  lastWinDate: string | null;  // ISO date of most recent completed daily
  bestMs: number | null;       // fastest daily win
  seenHowTo: boolean;
  day: DayProgress | null;     // today's progress (dropped when stale)
};

export const initialState = (): SavedState => ({
  v: 1, streak: 0, lastWinDate: null, bestMs: null, seenHowTo: false, day: null,
});

const DAY_MS = 86_400_000;
const daysBetween = (aIso: string, bIso: string): number =>
  Math.round((Date.parse(`${bIso}T00:00:00Z`) - Date.parse(`${aIso}T00:00:00Z`)) / DAY_MS);

// Called when today's 6th Set is found. Same-day repeats are no-ops.
export const recordWin = (s: SavedState, dateIso: string, elapsedMs: number): SavedState => {
  if (s.lastWinDate === dateIso) return s;
  return {
    ...s,
    streak: s.lastWinDate !== null && daysBetween(s.lastWinDate, dateIso) === 1 ? s.streak + 1 : 1,
    lastWinDate: dateIso,
    bestMs: s.bestMs === null ? elapsedMs : Math.min(s.bestMs, elapsedMs),
    day: {
      ...(s.day ?? { date: dateIso, foundKeys: [], startedAt: null }),
      date: dateIso,
      elapsedMs,
    },
  };
};

// Drop day progress that belongs to a previous date.
export const freshDay = (s: SavedState, dateIso: string): SavedState =>
  s.day && s.day.date === dateIso ? s : { ...s, day: null };

const KEY = "blorble.v1";

export const load = (storage: Pick<Storage, "getItem">): SavedState => {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as SavedState;
    return parsed.v === 1 ? { ...initialState(), ...parsed } : initialState();
  } catch {
    return initialState();
  }
};

export const save = (storage: Pick<Storage, "setItem">, s: SavedState): void => {
  try {
    storage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private browsing / quota — the game still plays, just doesn't persist */
  }
};
