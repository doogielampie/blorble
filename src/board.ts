import { type Card, DECK, allSets } from "./deck";
import { type Rng, dateToSeed, mulberry32 } from "./seed";

export const BOARD_SIZE = 12;
export const TARGET_SETS = 6;
// Measured over 3650 simulated dates: mean k≈41, max k=293. 10k is unreachable.
const MAX_ATTEMPTS = 10_000;

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

// Deterministic deal: try base seed, then base+1, base+2… until the board has
// exactly TARGET_SETS Sets. Every client converges to the same board.
export const boardForSeed = (baseSeed: number): DealtBoard => {
  for (let k = 0; k < MAX_ATTEMPTS; k++) {
    const cards = shuffle(mulberry32((baseSeed + k) >>> 0), DECK).slice(0, BOARD_SIZE);
    const sets = allSets(cards);
    if (sets.length === TARGET_SETS) return { cards, sets, attempt: k };
  }
  throw new Error("no 6-Set board found — statistically impossible");
};

export const dailyBoard = (isoDate: string): DealtBoard => boardForSeed(dateToSeed(isoDate));

export const practiceBoard = (): DealtBoard =>
  boardForSeed(Math.floor(Math.random() * 0x100000000));
