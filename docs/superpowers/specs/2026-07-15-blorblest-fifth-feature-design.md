# Blorblest — hidden 5-feature hard tier (design spec)

Validated 2026-07-15. Implementation plan: `~/.claude/plans/breezy-prancing-ladybug.md`.

## What

1. **A 5th matchable feature: body FILL** — solid / striped / spotted. SET's own "shading"
   axis, i.e. the revival of v1's retired `pattern` channel (`design/blorble/BLORB-SPEC.md:22`).
2. **Blorblest** — a hidden hard tier drawing from the 3⁵ = 243-card 5-feature deck, beside
   Blorblet (9 / 4) and Blorble (12 / 6). Board 12; `targetSets` locked by a sampling probe.
3. **Unlock** — earned, not shown: solve the day's Blorble *clean* (`hints === 0 && wrongs === 0`,
   the codebase's existing ✨ predicate). One-way `blorblestUnlocked` flag; the segment then
   appears permanently. Blorblest wins do NOT touch the global streak.
4. **Rides along:** star-tip recolour `TIP_COLORS[1]` gold `#f0a91e` → violet `#9b6bd3`
   (player feedback: gold reads too close to the orange body `#f2953c`). Hex-only, per the
   sanctioned precedent (`src/blorb.ts:11-13`).
5. **Release: v2.5.0** (additive minor; 3.x reserved for the V3 flagship direction).

## Hard constraints

- Live Blorble/Blorblet **seeds never re-deal**: blorblest gets a third namespaced seed stream
  (`blorblest:${isoDate}`); the existing bare-date and `basic:` streams are untouched.
- Renderer output stays **byte-identical** for 4-tuple cards and for `fill = 0` (solid):
  the fill layer emits `""` in both cases. Existing byte-exact pins must pass unchanged.
- `Card` widens to `readonly [number, number, number, number, number?]` — never a fixed
  5-tuple, and never mix arities on one board (`isSet` iterates the first card's length).
- Base `DECK` stays 81 four-tuples; `DECK5` (243) is a separate builder.
- Storage stays `v: 2`; new fields are additive and auto-healed by the spread-merge load.
  `persist()`'s two-mode cross-tab merge must become mode-generic (3rd mode would clobber).

## Fill art

Marks in `darken(COLORS[ci], 0.44)` (multiply RGB by 1 − f — same hue as the body, so CVD
separation is inherited), tiled shape-agnostically and clipped to the existing
`bclip-${uid}` silhouette. Layer order: body fill → **fill marks (clipped)** → vertical
shading (clipped) → outline → face. Values: 0 solid (nothing) / 1 striped / 2 spotted.

## Star recolour test policy

New *normal-vision* ΔE gate between each tip fill and each body colour, with the threshold
tuned so the old gold-vs-orange pairing FAILS (encodes the feedback as a regression test).
Tip-vs-body is deliberately not CVD-gated — the tip silhouette carries the channel
(doctrine, `src/blorb.ts:7-9`); the trio's existing ΔE ≥ 20 CVD gate must still pass.

## Out of scope

- No new expression/valence work; no share-text changes (`shareText` format is frozen; the
  new `label` flows through the existing mode-agnostic receipt).
- No deploy: user playtests locally on branch `blorblest`; nothing is pushed to GitHub
  without explicit approval (Pages deploys from the repo).
