const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "3:41"; hours only when needed ("1:02:09").
export const formatTime = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const s = total % 60, m = Math.floor(total / 60) % 60, h = Math.floor(total / 3600);
  return `${h > 0 ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s).padStart(2, "0")}`;
};

// "2026-07-01" → "Jul 1" (fixed English so shares match across devices).
export const formatDate = (isoDate: string): string =>
  `${MONTHS[Number(isoDate.slice(5, 7)) - 1]} ${Number(isoDate.slice(8, 10))}`;

export type ShareInfo = {
  label: string;       // "Blorble" | "Blorblet" (resolved by the caller)
  isoDate: string;
  elapsedMs: number;
  hints: number;
  wrongs: number;
  practice?: boolean;
  size: number;        // Blorbs on the board (9 | 12) — for the receipt
  sets: number;        // target Sets (4 | 6) — for the receipt
};

// Spoiler-free, honesty-first: raw time plus what it took. ✨ = clean solve.
export const shareText = ({ label, isoDate, elapsedMs, hints, wrongs, practice = false }: ShareInfo): string => {
  const marks = hints === 0 && wrongs === 0
    ? "✨"
    : [hints > 0 ? `💡${hints}` : "", wrongs > 0 ? `✖️${wrongs}` : ""].filter(Boolean).join(" ");
  return `${label} · ${practice ? "practice" : formatDate(isoDate)} · ⏱ ${formatTime(elapsedMs)} · ${marks}`;
};
