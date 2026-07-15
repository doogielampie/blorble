import { type Card, DECK, DECK5, allSets } from "./deck";
import { type Rng, dateToSeed, mulberry32 } from "./seed";

export type PuzzleMode = "blorble" | "blorblet" | "blorblest";

export const MODES = {
  blorble: { size: 12, targetSets: 6, label: "Blorble" },
  blorblet: { size: 9, targetSets: 4, label: "Blorblet" },
  // Hidden hard tier: 12 five-feature Blorbs from DECK5, only 4 Pods.
  // targetSets probed 2026-07-15 (365 dates): 4 → mean k≈126 max 654 (in
  // family with the live modes); 5 → max k≈10k (slow deals); 6 → misses
  // a 60k cap 7/365 times. Sparse Pods ARE the difficulty.
  blorblest: { size: 12, targetSets: 4, label: "Blorblest" },
} as const;

// kept for existing imports/tests
export const BOARD_SIZE = 12;
export const TARGET_SETS = 6;
// Measured: blorble mean k≈41 max 293; blorblet mean k≈141 max 1149 (3650 dates). 100k unreachable.
const MAX_ATTEMPTS = 100_000;

export type DealtBoard = {
  cards: Card[];      // the 12 Blorbs in display order
  sets: number[][];   // all 6 Sets as sorted index triples (solver output)
  attempt: number;    // which sub-seed k produced it (debugging aid)
};

const shuffle = <T,>(rng: Rng, xs: readonly T[]): T[] => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

export const boardForSeed = (
  baseSeed: number,
  size = 12,
  targetSets = 6,
  deck: readonly Card[] = DECK,
): DealtBoard => {
  for (let k = 0; k < MAX_ATTEMPTS; k++) {
    const cards = shuffle(mulberry32((baseSeed + k) >>> 0), deck).slice(0, size);
    const sets = allSets(cards);
    if (sets.length === targetSets) return { cards, sets, attempt: k };
  }
  throw new Error("no qualifying board found — statistically impossible");
};

// Blorble keeps the v1 seed formula (bare date) so live boards never re-deal
// on deploy; blorblet/blorblest each get their own namespaced seed stream.
const SEED_PREFIX: Record<PuzzleMode, string> = {
  blorble: "", // v1 formula — DO NOT change
  blorblet: "basic:",
  blorblest: "blorblest:",
};

const deckFor = (mode: PuzzleMode): readonly Card[] => (mode === "blorblest" ? DECK5 : DECK);

export const dailyBoard = (isoDate: string, mode: PuzzleMode = "blorble"): DealtBoard => {
  const m = MODES[mode];
  const seed = dateToSeed(`${SEED_PREFIX[mode]}${isoDate}`);
  return boardForSeed(seed, m.size, m.targetSets, deckFor(mode));
};

export const practiceBoard = (mode: PuzzleMode = "blorble"): DealtBoard => {
  const m = MODES[mode];
  return boardForSeed(Math.floor(Math.random() * 0x100000000), m.size, m.targetSets, deckFor(mode));
};
