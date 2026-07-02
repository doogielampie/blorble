import { type Card, isSet } from "./deck";

export const TOTAL_SETS = 6;

export type GameState = {
  cards: readonly Card[];
  selected: number[];    // 0–3 board indices; cleared whenever a trio resolves
  foundKeys: string[];   // resolved Sets in insertion order, as "i-j-k"
  target: number;        // Sets needed to win (6 Blorble, 4 Blorblet)
};

export type GameEvent =
  | { kind: "select"; index: number }
  | { kind: "deselect"; index: number }
  | { kind: "found"; trio: number[]; won: boolean }
  | { kind: "duplicate"; trio: number[] }
  | { kind: "invalid"; trio: number[] };

export type Hint = { kind: "extend" | "reveal"; index: number } | { kind: "deadend" };

export const trioKey = (trio: number[]): string =>
  [...trio].sort((a, b) => a - b).join("-");

// Tap a card: toggle selection; the third selection resolves the trio.
export const tap = (s: GameState, index: number): { state: GameState; event: GameEvent } => {
  if (s.selected.includes(index))
    return {
      state: { ...s, selected: s.selected.filter((i) => i !== index) },
      event: { kind: "deselect", index },
    };
  const selected = [...s.selected, index];
  if (selected.length < 3)
    return { state: { ...s, selected }, event: { kind: "select", index } };

  const trio = [...selected].sort((a, b) => a - b);
  const [i, j, k] = trio as [number, number, number];
  const cleared: GameState = { ...s, selected: [] };
  if (!isSet(s.cards[i]!, s.cards[j]!, s.cards[k]!))
    return { state: cleared, event: { kind: "invalid", trio } };
  const key = trioKey(trio);
  if (s.foundKeys.includes(key))
    return { state: cleared, event: { kind: "duplicate", trio } };
  const state: GameState = { ...cleared, foundKeys: [...s.foundKeys, key] };
  return { state, event: { kind: "found", trio, won: state.foundKeys.length >= s.target } };
};

// Annie-Hu-style hint: build on the current selection when it can still become
// an unfound Set, call out dead ends, otherwise reveal one card to start from.
export const hint = (s: GameState, sets: number[][]): Hint | null => {
  const unfound = sets.filter((t) => !s.foundKeys.includes(trioKey(t)));
  if (unfound.length === 0) return null;
  if (s.selected.length > 0) {
    const extendable = unfound.find((t) => s.selected.every((i) => t.includes(i)));
    if (!extendable) return { kind: "deadend" };
    return { kind: "extend", index: extendable.find((i) => !s.selected.includes(i))! };
  }
  return { kind: "reveal", index: unfound[0]![0]! };
};
