import { describe, expect, test } from "vitest";
import { allSets } from "./deck";
import { dailyBoard, practiceBoard } from "./board";

describe("board", () => {
  test("dailyBoard is deterministic and pinned for 2026-07-01", () => {
    const a = dailyBoard("2026-07-01");
    expect(a).toEqual(dailyBoard("2026-07-01"));
    // Pinned: a silent change to hash/shuffle/retry would re-deal every
    // shipped daily without failing any other test.
    expect(a.attempt).toBe(93);
    expect(a.cards).toEqual([
      [2, 2, 2, 2], [1, 2, 1, 2], [0, 2, 2, 0], [0, 2, 0, 2],
      [1, 0, 2, 0], [0, 2, 2, 2], [2, 0, 2, 0], [2, 2, 1, 0],
      [1, 0, 1, 2], [0, 2, 1, 1], [0, 0, 2, 0], [2, 2, 0, 1],
    ]);
    expect(a.sets).toEqual([[0, 1, 3], [0, 7, 11], [1, 2, 11], [1, 7, 9], [2, 3, 9], [4, 6, 10]]);
  });

  test("boards have 12 distinct cards and exactly 6 solver-verified Sets", () => {
    for (const iso of ["2026-07-01", "2026-07-02", "2026-12-25", "2027-03-14"]) {
      const { cards, sets } = dailyBoard(iso);
      expect(cards.length).toBe(12);
      expect(new Set(cards.map((c) => c.join(""))).size).toBe(12);
      expect(sets.length).toBe(6);
      expect(allSets(cards)).toEqual(sets);
    }
  });

  test("different dates give different boards", () => {
    expect(dailyBoard("2026-07-01").cards).not.toEqual(dailyBoard("2026-07-02").cards);
  });

  test("practiceBoard returns a valid 12/6 board", () => {
    const { cards, sets } = practiceBoard();
    expect(cards.length).toBe(12);
    expect(sets.length).toBe(6);
  });
});
