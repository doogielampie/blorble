# Blorble 👾

**Blorble** is a free daily monster-matching puzzle. Every day choose your challenge:
**Blorblet** (9 Blorbs hiding exactly 4 Pods — the quick one) or **Blorble** (12 Blorbs
hiding exactly 6 Pods). Trios where each feature (colour, eye count, shape, antennae)
is either the same on all three Blorbs or different on all three. Find them all, race
the clock, and share your time. New board at midnight UTC; unlimited practice boards included.

The board is the home screen — a toggle up top switches between the two dailies (✓ marks
the ones you've finished), and a fresh board waits face-down behind a Play curtain so the
clock only starts when you do. Practice boards live one quiet link away.

**Play: https://doogielampie.github.io/blorble/**

## Hints & Honest Shares

Stuck? Hit the hint button: with nothing selected it points at a Blorb from an unfound
pod; otherwise it builds on your selection, or shakes it if it can't become a pod. When
you solve, your result line shows your time plus 💡 hints used and
✖️ wrong guesses (or ✨ for a clean solve). The result popup is a printable-style **receipt**
— mode, pods found, hints, grumps, and your time — that copies to a shareable image so you
can post your win.

## Develop

- `pnpm install` && `pnpm dev` — local dev server
- `pnpm check` — typecheck + unit tests (Vitest)
- `PREVIEW=1 pnpm vitest run src/preview.test.ts` — writes `preview/blorbs.html`
  for visual review of the card art (rasterize with headless Chrome)

Pure game logic lives in small tested modules (`src/deck.ts`, `board.ts`,
`game.ts`, …); the canonical Blorb art spec lives in `design/blorble-v2/` (v1 history in `design/blorble/`).

---

*Inspired by the card game SET; not affiliated with Set Enterprises/PlayMonster.*
