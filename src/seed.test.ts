import { describe, expect, test } from "vitest";
import { dateToSeed, mulberry32, todayIso } from "./seed";

describe("seed", () => {
  test("dateToSeed is a stable pinned uint32 and varies by date", () => {
    expect(dateToSeed("2026-07-01")).toBe(4022664412); // pinned: changing the hash re-deals every shipped daily
    expect(dateToSeed("2026-07-01")).not.toBe(dateToSeed("2026-07-02"));
  });

  test("mulberry32 is deterministic and emits [0,1)", () => {
    const a = mulberry32(123), b = mulberry32(123);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(new Set(xs).size).toBe(5);
  });

  test("todayIso is UTC YYYY-MM-DD", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
