import { describe, expect, test } from "vitest";
import { dailyBoard } from "./board";
import { type GameState, tap, trioKey } from "./game";

const deal = dailyBoard("2026-07-01");
const fresh = (): GameState => ({ cards: deal.cards, selected: [], foundKeys: [] });

describe("game state machine", () => {
  test("tap selects; tapping again deselects", () => {
    let r = tap(fresh(), 3);
    expect(r.event).toEqual({ kind: "select", index: 3 });
    expect(r.state.selected).toEqual([3]);
    r = tap(r.state, 3);
    expect(r.event).toEqual({ kind: "deselect", index: 3 });
    expect(r.state.selected).toEqual([]);
  });

  test("third tap resolves a valid Set regardless of order", () => {
    const [i, j, k] = deal.sets[0]! as [number, number, number];
    let s = fresh();
    s = tap(s, k).state;
    s = tap(s, i).state;
    const r = tap(s, j);
    expect(r.event).toEqual({ kind: "found", trio: [i, j, k], won: false });
    expect(r.state.foundKeys).toEqual([trioKey([i, j, k])]);
    expect(r.state.selected).toEqual([]);
  });

  test("re-finding a found Set is a duplicate — no penalty, nothing added", () => {
    const [i, j, k] = deal.sets[0]! as [number, number, number];
    let s: GameState = { ...fresh(), foundKeys: [trioKey([i, j, k])] };
    s = tap(s, i).state;
    s = tap(s, j).state;
    const r = tap(s, k);
    expect(r.event.kind).toBe("duplicate");
    expect(r.state.foundKeys.length).toBe(1);
    expect(r.state.selected).toEqual([]);
  });

  test("invalid trio clears the selection", () => {
    const setKeys = new Set(deal.sets.map((t) => t.join("-")));
    let trio: [number, number, number] = [0, 1, 2];
    outer: for (let i = 0; i < 12; i++)
      for (let j = i + 1; j < 12; j++)
        for (let k = j + 1; k < 12; k++)
          if (!setKeys.has([i, j, k].join("-"))) { trio = [i, j, k]; break outer; }
    let s = fresh();
    s = tap(s, trio[0]).state;
    s = tap(s, trio[1]).state;
    const r = tap(s, trio[2]);
    expect(r.event.kind).toBe("invalid");
    expect(r.state.selected).toEqual([]);
    expect(r.state.foundKeys).toEqual([]);
  });

  test("finding all six Sets reports won on the sixth", () => {
    let s = fresh();
    deal.sets.forEach((set, n) => {
      let last!: ReturnType<typeof tap>;
      for (const i of set) {
        last = tap(s, i);
        s = last.state;
      }
      expect(last.event).toEqual({ kind: "found", trio: set, won: n === 5 });
    });
  });
});
