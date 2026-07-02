import { describe, expect, test } from "vitest";
import { type Card, DECK, allSets, isSet } from "./deck";
import { mulberry32 } from "./seed";

describe("deck", () => {
  test("DECK has 81 unique cards", () => {
    expect(DECK.length).toBe(81);
    expect(new Set(DECK.map((c) => c.join(""))).size).toBe(81);
  });

  test("isSet accepts all-same/all-different per attribute, rejects two-and-one", () => {
    expect(isSet([0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 2])).toBe(true);
    expect(isSet([0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2])).toBe(true);
    expect(isSet([0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 1])).toBe(false);
    expect(isSet([0, 1, 2, 0], [1, 1, 0, 1], [2, 1, 1, 1])).toBe(false);
  });

  test("any two distinct cards have exactly one completing third", () => {
    const rng = mulberry32(7);
    for (let t = 0; t < 50; t++) {
      const i = Math.floor(rng() * 81);
      let j = Math.floor(rng() * 81);
      if (j === i) j = (j + 1) % 81;
      const completions = DECK.filter(
        (c) => c !== DECK[i] && c !== DECK[j] && isSet(DECK[i]!, DECK[j]!, c),
      );
      expect(completions.length).toBe(1);
    }
  });

  test("allSets finds sorted index triples on a known board", () => {
    const board: Card[] = [
      [0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 2], // 0,1,2 is a Set
      [1, 1, 1, 0], [2, 2, 2, 0],               // 0,3,4 is a Set
    ];
    expect(allSets(board)).toEqual([[0, 1, 2], [0, 3, 4]]);
  });
});
