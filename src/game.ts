import { type Card, isSet } from "./deck";

export const TOTAL_SETS = 6;

export type GameState = {
  cards: readonly Card[];
  selected: number[];    // 0–3 board indices; cleared whenever a trio resolves
  foundKeys: string[];   // resolved Sets in insertion order, as "i-j-k"
};

export type GameEvent =
  | { kind: "select"; index: number }
  | { kind: "deselect"; index: number }
  | { kind: "found"; trio: number[]; won: boolean }
  | { kind: "duplicate"; trio: number[] }
  | { kind: "invalid"; trio: number[] };

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
  return { state, event: { kind: "found", trio, won: state.foundKeys.length >= TOTAL_SETS } };
};
