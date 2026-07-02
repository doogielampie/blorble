# Blorble 👾

**Blorble** is a free daily pattern-matching puzzle. Every day, the same 12
goofy alien monsters ("Blorbs") hide **exactly 6 Sets** — trios where each
feature (colour, eye count, shape, pattern) is either the same on all three
Blorbs or different on all three. Find them all, race the clock, and share
your time. New board at midnight UTC; unlimited practice boards included.

**Play: https://doogielampie.github.io/blorble/**

## Develop

- `pnpm install` && `pnpm dev` — local dev server
- `pnpm check` — typecheck + unit tests (Vitest)
- `PREVIEW=1 pnpm vitest run src/preview.test.ts` — writes `preview/blorbs.html`
  for visual review of the card art (rasterize with headless Chrome)

Pure game logic lives in small tested modules (`src/deck.ts`, `board.ts`,
`game.ts`, …); the canonical Blorb art spec lives in `design/blorble/`.

---

*Inspired by the card game SET; not affiliated with Set Enterprises/PlayMonster.*
