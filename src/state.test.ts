import { describe, expect, test } from "vitest";
import { freshDay, initialState, load, recordWin, save } from "./state";

const fakeStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const day = (date: string) => ({ date, foundKeys: ["0-1-2"], startedAt: 5, elapsedMs: null, hints: 1, wrongs: 2 });

describe("state v2", () => {
  test("first win: streak 1, per-mode best", () => {
    const s = recordWin(initialState(), "blorblet", "2026-07-01", 100_000);
    expect(s.streak).toBe(1);
    expect(s.best.blorblet).toBe(100_000);
    expect(s.best.blorble).toBeNull();
    expect(s.days.blorblet?.elapsedMs).toBe(100_000);
  });

  test("completing BOTH modes in one day increments streak once", () => {
    let s = recordWin(initialState(), "blorble", "2026-07-01", 200_000);
    s = recordWin(s, "blorblet", "2026-07-01", 90_000);
    expect(s.streak).toBe(1);
    expect(s.best.blorblet).toBe(90_000);   // second mode still records
    s = recordWin(s, "blorblet", "2026-07-02", 80_000);
    expect(s.streak).toBe(2);               // either mode continues the streak
  });

  test("same mode, same day is a no-op", () => {
    const s = recordWin(initialState(), "blorble", "2026-07-01", 100_000);
    expect(recordWin(s, "blorble", "2026-07-01", 50_000)).toBe(s);
  });

  test("gaps reset streak to 1; best only improves per mode", () => {
    let s = recordWin(initialState(), "blorble", "2026-07-01", 100_000);
    s = recordWin(s, "blorble", "2026-07-04", 150_000);
    expect(s.streak).toBe(1);
    expect(s.best.blorble).toBe(100_000);
  });

  test("freshDay drops each mode's stale day independently", () => {
    const s = { ...initialState(), days: { blorble: day("2026-07-01"), blorblet: day("2026-07-02") } };
    const f = freshDay(s, "2026-07-02");
    expect(f.days.blorble).toBeNull();
    expect(f.days.blorblet).toEqual(day("2026-07-02"));
  });

  test("v1 saves migrate losslessly", () => {
    const st = fakeStorage();
    st.setItem("blorble.v1", JSON.stringify({
      v: 1, streak: 7, lastWinDate: "2026-07-01", bestMs: 221_000, seenHowTo: true,
      day: { date: "2026-07-01", foundKeys: ["0-1-2"], startedAt: 9, elapsedMs: 221_000 },
    }));
    const s = load(st);
    expect(s.v).toBe(2);
    expect(s.streak).toBe(7);
    expect(s.best).toEqual({ blorble: 221_000, blorblet: null });
    expect(s.days.blorble).toEqual({ date: "2026-07-01", foundKeys: ["0-1-2"], startedAt: 9, elapsedMs: 221_000, hints: 0, wrongs: 0 });
    expect(s.seenHowTo).toBe(true);
    expect(s.lastMode).toBe("blorble");
  });

  test("v2 round-trip; garbage survives", () => {
    const st = fakeStorage();
    const s = recordWin(initialState(), "blorblet", "2026-07-01", 100_000);
    save(st, s);
    expect(load(st)).toEqual(s);
    st.setItem("blorble.v1", "{nope");
    expect(load(st)).toEqual(initialState());
  });
});
