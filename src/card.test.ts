import { describe, expect, test } from "vitest";
import { cardLines } from "./card";

describe("stats card lines", () => {
  test("clean daily", () => {
    expect(cardLines({ label: "Blorble", isoDate: "2026-07-02", elapsedMs: 433_000, hints: 0, wrongs: 0, streak: 3, best: 296_000 }))
      .toEqual(["Jul 2 · ⏱ 7:13 · ✨", "🔥 3-day streak", "🏆 best 4:56"]);
  });
  test("hints/wrongs shown; first-day copy; no best yet", () => {
    expect(cardLines({ label: "Blorblet", isoDate: "2026-07-02", elapsedMs: 161_000, hints: 2, wrongs: 1, streak: 1, best: null }))
      .toEqual(["Jul 2 · ⏱ 2:41 · 💡2 ✖️1", "🔥 1-day streak"]);
  });
  test("practice card carries no streak/best", () => {
    expect(cardLines({ label: "Blorble", isoDate: "2026-07-02", elapsedMs: 61_000, hints: 0, wrongs: 0, practice: true, streak: 5, best: 100_000 }))
      .toEqual(["practice · ⏱ 1:01 · ✨"]);
  });
});
