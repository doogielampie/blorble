# Art v2 Handoff — Blorb artwork redesign (design session)

**Mission:** Redesign the Blorb artwork. The user's verdict on v1 art: "doesn't look terrible but I'm not crazy about it either — especially the spots and stripes, I just don't think they look very good." Target: still simple, cute, and funny, but **refined — not obviously programmatically rendered**. This is a DESIGN session: iterate art candidates with the user judging rasters each round; only after the user locks a direction does implementation happen.

**Approach (already decided by the user, 2026-07-02 — do not relitigate):** stay **programmatic SVG** (a full AI-image sprite pipeline was considered and rejected: 81 cards × 3 expressions must stay channel-consistent, and expressions/future edits must stay cheap). AI images MAY be used as style *references* if helpful. The redesign pass covers pattern treatments (spots/stripes) first and body polish (shading, belly patch, blush, outline character) second.

## The game (context)

Live daily SET-style puzzle at https://doogielampie.github.io/blorble/ (repo `~/Projects/blorble`, GitHub Pages via Actions). A Blorb is a 4-tuple, 3 values each (81 cards): colour (blue `#1f97f0` / orange `#f2953c` / pink `#eb648c` — CVD-adjusted, test-enforced), eyes (1/2/3), shape (round/ghost/teardrop), pattern (solid/spots/stripes). Fixed species trim: ink `#2a2320` outline, googly eyes, two antennae, open fang mouth, no arms. Expressions: rest / happy (grin) / grumpy (brows + frown) — swap ONLY eyes/mouth layers.

## Hard constraints (gameplay-load-bearing — the redesign must preserve)

1. **The four channels must be instantly distinguishable** — at EVERY render size the game uses:
   - board cards ~85–130px · found-slot minis **22–30px** (patterns must still read here!) · landing samples ~55px · how-to legend ~34px · how-to examples ~90px · results mascot 110px + canvas 320px · favicon ~32px.
2. **Layer order** (what makes patterns look natural): antennae → body fill (no stroke) → pattern clipped to the FULL body silhouette (markings reach the edge — never inset) → outline on top → eyes → (grumpy brows) → mouth.
3. **`<clipPath>` children must be raw shape elements** — a `<g>` wrapper inside clipPath silently clips everything away in Chrome.
4. **Colour trio must keep passing the CVD gate** (`src/colors.cvd.test.ts`, Viénot protan/deutan ΔE ≥ 30). Hex tweaks allowed; re-run the gate. Pattern-dark is currently `darken(bodyColor, 0.44)` — tunable, but keep spots/stripes clearly visible on all three bodies for colour-blind players (pattern is its own channel; it can't rely on hue).
5. **Expressions stay eye/mouth-only swaps** on whatever new body art emerges; happy/grumpy must read at board size.
6. `renderBlorb(card, uid, expression)` keeps its signature — every consumer (board, minis, landing, legend, mascot, canvas stats-card, favicon) renders through it. viewBox may change if needed, but check every consumer size if it does.

## Process (the protocol that produced v1's approved art — reuse it)

- **R0:** create `design/blorble-v2/playground.html` — a copy of `design/blorble/reference-renderer.html` restructured to show VARIANT COLUMNS side-by-side for the same sample cards (current art | candidate A | candidate B | candidate C), plus a mini-size row (28px) per variant to prove small-size readability.
- **Round-1 candidate directions** (starting points, from the approved v2 plan — evolve freely):
  - **Spots:** irregular organic blobs — closed cubic paths (4–5 anchors, radii jittered ±25% with a fixed per-position seed → deterministic), sizes varied, same per-shape layouts as v1 (they're tuned to clear the face).
  - **Stripes:** tapered wavy ribbons — filled paths whose width varies along the band (e.g. 16→22→16), slight per-band phase shift, instead of uniform 21px strokes.
  - **Body polish (all variants):** subtle radial/vertical shading (~8% darker toward the bottom), lighter belly patch, two blush marks at low opacity, slightly varied outline weight.
- **R1..Rn — USER LOOK gates:** raster the playground (940px wide, headless Chrome `file://` — see commands in `src/preview.test.ts` history / plan), post the image IN CHAT, **wait for the user's feedback**. Iterate until the user says LOCKED. Never self-approve art.
- **Port phase (only after lock):** write a proper implementation plan (writing-plans skill), then: port to `src/blorb.ts`; update the pinned strings in `src/blorb.test.ts` (REST/HAPPY/GRUMPY mouth constants, pattern-count assertions) to the new canonical geometry; regenerate ALL raster checkpoints (deck sheet, expressions, colours, full UI pass with `tools/phone-shot.sh`, live post-deploy); `design/blorble-v2/` becomes the canonical art folder (keep `design/blorble/` for history); update README if visuals in it are described.

## Toolchain gotchas (paid for — don't rediscover)

- Phone-size UI rasters MUST use `tools/phone-shot.sh OUT.png W H "/blorble/?query" [PROFILE_DIR] [PORT]` — headless Chrome clamps window width to ≥500px, so raw `--window-size=390,…` screenshots silently lie. PNG = (W+200)×(H+200); judge the top-left W×H. Pin PORT when two shots must share localStorage (origin includes port).
- Static art grids (the playground) can use plain `--headless=new --screenshot --window-size=940,H file://…` (≥500px wide is safe) with `--user-data-dir=$(mktemp -d)`; Chrome lingers after writing — run it backgrounded, poll for the file, then kill.
- Global `pnpm` (no corepack). Vitest on Node 25 sometimes exits SIGABRT after green output — rerun once.
- `pnpm check` = tsc strict + vitest; must be green at every commit. Never screenshot the Vite dev server (HMR hangs) — `vite preview` or file://.
- Dev/raster URL params: `?date=YYYY-MM-DD` `?mode=blorblet|blorble` `?autoplay=1` `?solve=N` `?hint=1` `?practice=1` `?howto=1` (date/solve/autoplay/hint write to an isolated `dev.*` storage bucket).

## File map

- `src/blorb.ts` — THE renderer (current canonical art; port target). Colocated tests `src/blorb.test.ts` pin geometry.
- `design/blorble/` — v1 canonical folder (reference renderer + spec + approved sheet). Treat as history; do not modify.
- `docs/superpowers/plans/2026-07-02-blorble-v2.md` — Phase 2 section = the original art-redesign protocol this handoff supersedes/extends.
- `.superpowers/sdd/progress.md` — execution ledger of everything shipped (v1, v2, v2.1) incl. accepted decisions.
- `src/preview.test.ts` — PREVIEW=1-guarded grid writer (deck sheet + expressions + sample board) → `preview/blorbs.html`; the raster-and-LOOK loop for art.
- Consumers to spot-check after any art change: `src/main.ts` (board/minis/landing/legend/mascot/favicon), `src/card.ts` (canvas stats-card draws the mascot via sized-SVG injection).

## What must NOT change in this session

Game logic, seeds/boards (`board.ts`/`seed.ts`), storage schema/key (`state.ts`), share text format (`share.ts`), the game's UI structure (v2.1 just shipped: landing screen, hint pill, minimal results dialog). Art only.

## Definition of done

1. User has LOCKED the new art after iterative rounds (their explicit word in chat).
2. Ported, typed, verbatim-faithful renderer in `src/blorb.ts`; all pinned tests updated; `pnpm check` green; CVD gate green.
3. Full raster re-verification (deck sheet vs the NEW locked reference, expressions, one full UI pass at 390×844 + 375×667).
4. Deployed; live smoke test; ledger + project memory updated; `design/blorble-v2/` established as canonical with its own locked reference sheet + spec notes.
