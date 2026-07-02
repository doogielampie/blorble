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

// Spoiler-free share line. No puzzle numbers in v1 — the date is the id.
export const shareText = (isoDate: string, elapsedMs: number, practice = false): string =>
  `Blorble · ${practice ? "practice" : formatDate(isoDate)} · ⏱ ${formatTime(elapsedMs)}`;
