import { describe, expect, test } from "vitest";
import { allSets } from "./deck";
import { dailyBoard, practiceBoard, type PuzzleMode } from "./board";

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

  test("blorblet daily is deterministic and pinned for 2026-07-01", () => {
    const b = dailyBoard("2026-07-01", "blorblet");
    expect(b.attempt).toBe(243);
    expect(b.cards).toEqual([
      [0, 2, 2, 0], [0, 2, 2, 2], [1, 1, 1, 2], [0, 0, 2, 0], [2, 1, 2, 2],
      [0, 1, 2, 0], [2, 1, 0, 0], [0, 1, 2, 1], [2, 1, 0, 1],
    ]);
    expect(b.sets).toEqual([[0, 3, 5], [1, 3, 7], [2, 5, 8], [2, 6, 7]]);
  });

  test("blorblet boards have 9 distinct cards and exactly 4 Sets", () => {
    for (const iso of ["2026-07-01", "2026-07-02", "2026-12-25"]) {
      const { cards, sets } = dailyBoard(iso, "blorblet");
      expect(cards.length).toBe(9);
      expect(new Set(cards.map((c) => c.join(""))).size).toBe(9);
      expect(sets.length).toBe(4);
      expect(allSets(cards)).toEqual(sets);
    }
  });

  test("blorblest daily is deterministic, 5-feature, and stream-isolated", () => {
    const b = dailyBoard("2026-07-01", "blorblest");
    expect(b).toEqual(dailyBoard("2026-07-01", "blorblest"));
    expect(b.cards.length).toBe(12);
    expect(new Set(b.cards.map((c) => c.join(""))).size).toBe(12);
    expect(b.cards.every((c) => c.length === 5)).toBe(true);
    expect(b.sets.length).toBe(4);
    expect(allSets(b.cards)).toEqual(b.sets);
    // own seed stream — never the blorble deal for the same date
    expect(b.cards).not.toEqual(dailyBoard("2026-07-01").cards);
    // Pinned like the other modes: a silent change to hash/shuffle/retry/deck
    // would re-deal every shipped blorblest daily without failing elsewhere.
    expect(b.attempt).toBe(7);
    expect(b.cards).toEqual([
      [2, 1, 1, 1, 2], [1, 2, 1, 2, 1], [1, 0, 1, 2, 2], [1, 1, 2, 1, 2],
      [0, 0, 1, 1, 2], [0, 1, 1, 0, 0], [1, 0, 0, 0, 0], [0, 2, 2, 2, 1],
      [1, 2, 0, 0, 2], [0, 2, 2, 0, 0], [2, 1, 0, 1, 1], [2, 0, 0, 1, 0],
    ]);
    expect(b.sets).toEqual([[0, 6, 7], [1, 3, 6], [2, 3, 8], [2, 9, 10]]);
  });

  test("blorble default mode is byte-compatible with v1 seeds", () => {
    expect(dailyBoard("2026-07-01")).toEqual(dailyBoard("2026-07-01", "blorble"));
  });

  test("practiceBoard respects mode size/target", () => {
    const p = practiceBoard("blorblet");
    expect(p.cards.length).toBe(9);
    expect(p.sets.length).toBe(4);
  });

  test("blorblest practiceBoard deals 12 five-feature cards with 4 Pods", () => {
    const p = practiceBoard("blorblest");
    expect(p.cards.length).toBe(12);
    expect(p.cards.every((c) => c.length === 5)).toBe(true);
    expect(p.sets.length).toBe(4);
  });
});
