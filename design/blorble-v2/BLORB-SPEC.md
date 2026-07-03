# BLORB-SPEC v2 — locked 2026-07-03

Canonical art: `src/blorb.ts` (ported verbatim from `playground.html` in this folder —
the "cute" render path). v1 spec/history: `design/blorble/` (do not modify).

## Channels (4 × 3 = 81 cards)
| Channel | Values | Carrier |
|---|---|---|
| Colour  | blue `#1f97f0` / orange `#f2953c` / pink `#eb648c` | body fill (CVD gate ΔE≥30, `colors.cvd.test.ts`) |
| Eyes    | 1 / 2 / 3 | googly eyes, step 44, white r19 (x,105), pupil r11 (x+1,108), highlights r4.3 (x-5,98) + r1.9 (x+6,113) |
| Shape   | round / ghost / teardrop | body silhouette (unchanged from v1) |
| Antenna | ball / star / leaf | tip SILHOUETTE (ink disc r10 / 10-pt star rO14 rI7.7 gold `#f0a91e` / leaf 18×13 green `#3fa346`); colour is reinforcement only (relaxed gate ΔE≥20) |

## Fixed species trim
Ink `#2a2320` outline 4.5 · ground shadow (ellipse 100,206 r 50×7 @0.15) · straight antenna
stalks (width 4, dx17 dy40, tips rotate ±18° star / ±22° leaf) · open fang mouth · no arms.
Bases per shape (mirror at 200-lx): round (76,50) · ghost (74,48) · teardrop (80,74) —
teardrop MUST attach lower/narrower or the stalk floats outside the silhouette.

## Layer order (load-bearing)
ground shadow → antennae (under body) → body fill (no stroke) → vertical shading
(black 0→0.10 gradient, clipped to FULL silhouette) → outline on top → eyes → (grumpy
brows) → mouth. Expressions swap ONLY eyes/mouth/brows layers.

## viewBox
`0 -10 200 224`. Top -10 fits the tallest ink (ghost star/leaf ≈ y-7.8) with ~2 units of
margin and no wasted headroom. Consumers size by width; height:auto.

## Pitfalls (paid for)
- clipPath children must be RAW shapes — a `<g>` wrapper clips everything away in Chrome.
- `bclip-${uid}` AND `bshade-${uid}` are document-global — uid unique per `<svg>`.
- Tip sizes are AREA-matched (~314/317/~310 incl. stroke), not radius-matched — a solid
  disc reads bigger than a spiky star of equal reach.
- Star d-string is baked from Catmull-Rom smoothing (generator in playground.html).
