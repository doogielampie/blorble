import { describe, expect, test } from "vitest";
import { freshDay, initialState, load, recordWin, save } from "./state";

const fakeStorage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};

describe("state", () => {
  test("first win: streak 1, best set, date recorded", () => {
    const s = recordWin(initialState(), "2026-07-01", 221_000);
    expect(s.streak).toBe(1);
    expect(s.bestMs).toBe(221_000);
    expect(s.lastWinDate).toBe("2026-07-01");
    expect(s.day?.elapsedMs).toBe(221_000);
  });

  test("consecutive days increment streak; gaps reset to 1", () => {
    let s = recordWin(initialState(), "2026-07-01", 100_000);
    s = recordWin(s, "2026-07-02", 90_000);
    expect(s.streak).toBe(2);
    s = recordWin(s, "2026-07-04", 80_000);
    expect(s.streak).toBe(1);
  });

  test("winning the same day twice is a no-op", () => {
    const s = recordWin(initialState(), "2026-07-01", 100_000);
    expect(recordWin(s, "2026-07-01", 50_000)).toBe(s);
  });

  test("best time only improves", () => {
    let s = recordWin(initialState(), "2026-07-01", 100_000);
    s = recordWin(s, "2026-07-02", 150_000);
    expect(s.bestMs).toBe(100_000);
    s = recordWin(s, "2026-07-03", 60_000);
    expect(s.bestMs).toBe(60_000);
  });

  test("freshDay keeps today's progress, drops stale", () => {
    const day = { date: "2026-07-01", foundKeys: ["0-1-2"], startedAt: 5, elapsedMs: null };
    const s = { ...initialState(), day };
    expect(freshDay(s, "2026-07-01").day).toEqual(day);
    expect(freshDay(s, "2026-07-02").day).toBeNull();
  });

  test("load/save round-trip; load survives garbage and absence", () => {
    const st = fakeStorage();
    const s = recordWin(initialState(), "2026-07-01", 100_000);
    save(st, s);
    expect(load(st)).toEqual(s);
    st.setItem("blorble.v1", "{not json");
    expect(load(st)).toEqual(initialState());
    expect(load(fakeStorage())).toEqual(initialState());
  });
});
