// Face-down card back for the fresh-daily curtain (v2.2 §2): a pale body
// silhouette on the tile, no face — LOCKED treatment from
// design/blorble-v2.2-ui/mockups.html (cardBack). Backs cycle by BOARD INDEX,
// never by the card's real shape, so a face-down board leaks nothing.
// The paths are literal copies of the locked art's body silhouettes
// (src/blorb.ts SHAPES — locked, not exported); back.test.ts pins them
// against renderBlorb output so drift is caught.
const BACK_FILL = "#e7dfd3";

const SILHOUETTES: readonly string[] = [
  `<circle cx="100" cy="116" r="78" fill="${BACK_FILL}"/>`,
  `<path d="M30 160 C24 82 50 30 100 30 C150 30 176 82 170 160 C170 188 123 188 123 160 C123 188 77 188 77 160 C77 188 30 188 30 160 Z" fill="${BACK_FILL}"/>`,
  `<path d="M112 30 C118 52 168 96 166 132 a66 66 0 1 1 -132 1 C34 96 82 52 94 42 C100 34 105 30 112 30 Z" fill="${BACK_FILL}"/>`,
];

export const cardBackSvg = (index: number): string =>
  `<svg viewBox="0 0 200 214" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">${SILHOUETTES[index % 3]!}</svg>`;
