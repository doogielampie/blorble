// A Blorb card: [colour, eyes, shape, pattern], each attribute 0|1|2.
export type Card = readonly [number, number, number, number];

// All 81 cards in canonical order (matches the reference sheet grid).
export const DECK: readonly Card[] = (() => {
  const d: Card[] = [];
  for (let c = 0; c < 3; c++)
    for (let e = 0; e < 3; e++)
      for (let s = 0; s < 3; s++)
        for (let p = 0; p < 3; p++) d.push([c, e, s, p] as const);
  return d;
})();

// A trio is a Set iff every attribute is all-same or all-different,
// i.e. each attribute's three values sum to 0 mod 3.
export const isSet = (a: Card, b: Card, c: Card): boolean =>
  a.every((_, i) => (a[i]! + b[i]! + c[i]!) % 3 === 0);

// Every Set on a board, as sorted index triples in lexicographic order.
export const allSets = (board: readonly Card[]): number[][] => {
  const out: number[][] = [];
  for (let i = 0; i < board.length; i++)
    for (let j = i + 1; j < board.length; j++)
      for (let k = j + 1; k < board.length; k++)
        if (isSet(board[i]!, board[j]!, board[k]!)) out.push([i, j, k]);
  return out;
};
