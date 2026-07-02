# Blorble 👾

**Blorble** is a free daily pattern-matching puzzle. Every day choose your challenge:
**Blorblet** (9 Blorbs hiding exactly 4 Sets — the quick one) or **Blorble** (12 Blorbs
hiding exactly 6 Sets). Trios where each feature (colour, eye count, shape, pattern)
is either the same on all three Blorbs or different on all three. Find them all, race
the clock, and share your time. New board at midnight UTC; unlimited practice boards included.

Pick your level from the landing screen — each card tracks whether you've finished today's board.

**Play: https://doogielampie.github.io/blorble/**

## Hints & Honest Shares

Stuck? Hit the hint button: with nothing selected it points at a Blorb from an unfound
Set; otherwise it builds on your selection, or shakes it if it can't become a Set. When
you solve, your result line shows your time plus 💡 hints used and
✖️ wrong guesses (or ✨ for a clean solve). The result popup makes a shareable stats-card
image so you can post your win.

## Develop

- `pnpm install` && `pnpm dev` — local dev server
- `pnpm check` — typecheck + unit tests (Vitest)
- `PREVIEW=1 pnpm vitest run src/preview.test.ts` — writes `preview/blorbs.html`
  for visual review of the card art (rasterize with headless Chrome)

Pure game logic lives in small tested modules (`src/deck.ts`, `board.ts`,
`game.ts`, …); the canonical Blorb art spec lives in `design/blorble/`.

---

*Inspired by the card game SET; not affiliated with Set Enterprises/PlayMonster.*
