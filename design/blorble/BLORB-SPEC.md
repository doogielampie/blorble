# Blorb Art Spec — CANONICAL, LOCKED (2026-07-01)

The visual spec for the Blorble game pieces ("Blorbs"). **The source of truth is this folder** —
iterated to final approval with the user; do not restyle, "improve," or add variation beyond what
is specified. Copy this folder into the Blorble repo.

- **`reference-renderer.html` — the canonical IMPLEMENTATION.** Open in a browser to see the full
  81-card deck; its `renderBlorb()` function is the approved code. **Port it verbatim** into the
  game's `src/blorb.ts` (add types) — do NOT re-derive the art from the prose below.
- `blorb-reference-sheet.png` — the approved render, for visual comparison.
- This file — the rules, tokens, and pitfalls behind the code.

## The model

A Blorb is a 4-tuple, each attribute having exactly 3 values (SET-style; 81 total):

| # | Attribute | Values | Perceptual channel |
|---|-----------|--------|--------------------|
| 0 | `color`   | blue `#3f9fe0` · orange `#f2953c` · pink `#e56aa8` | hue |
| 1 | `eyes`    | 1 · 2 · 3 | numerosity (subitizing) |
| 2 | `shape`   | round · ghost · teardrop | form |
| 3 | `pattern` | solid · spots (blotches) · stripes | texture |

Colours pending a final CVD (colour-blindness) simulator check at build — the trio must stay
mutually distinguishable under deuteranopia/protanopia; adjust hex values only, not the concept.

**Everything else is fixed species trim** (identical on every Blorb, never varies):
dark outline, googly eyes, two antennae, open fang mouth, **no arms/hands**.

## Tokens

- Ink (outline, antennae, pupils, mouth): `#2a2320`
- Pattern dark = `darken(bodyColor, 0.44)` where `darken(hex,f)` multiplies each RGB channel by `(1-f)`
- Outline width: `4.5` · antenna stroke: `3` (round caps)
- Canvas: `viewBox="0 0 200 214"`

## Layer order (critical — this is what makes patterns look natural)

1. **Antennae** (drawn first, behind the body)
2. **Body fill** (shape with `fill=color`, NO stroke)
3. **Pattern**, clipped to the full body shape — markings reach the edge like a real animal's
4. **Body outline on top**: same shape, `fill="none" stroke=INK stroke-width="4.5"` — so the
   pattern never covers the outline. **Never inset/shrink the pattern** (looks like a fake rim).
5. **Eyes**, then **mouth**

## Exact geometry

Body shapes (the `a` argument is the attribute string, e.g. `fill="..."`):

```
round:    <circle cx="100" cy="116" r="78" {a}/>
ghost:    <path d="M30 160 C24 82 50 30 100 30 C150 30 176 82 170 160
                   C170 188 123 188 123 160 C123 188 77 188 77 160
                   C77 188 30 188 30 160 Z" {a}/>
teardrop: <path d="M112 30 C118 52 168 96 166 132 a66 66 0 1 1 -132 1
                   C34 96 82 52 94 42 C100 34 105 30 112 30 Z" {a}/>   <!-- curled tip -->
```

Antennae (behind body):

```
<g stroke="#2a2320" stroke-width="3" stroke-linecap="round">
  <line x1="84" y1="46" x2="72" y2="16"/><line x1="116" y1="46" x2="128" y2="16"/>
</g>
<circle cx="72" cy="13" r="6" fill="#2a2320"/><circle cx="128" cy="13" r="6" fill="#2a2320"/>
```

Eyes — n ∈ {1,2,3}, centers `x = 100 + (i - (n-1)/2) * 42`, `cy = 104`, per eye:

```
<circle cx="{x}"   cy="104" r="18"  fill="#fff" stroke="#2a2320" stroke-width="3"/>
<circle cx="{x+1}" cy="106" r="9"   fill="#2a2320"/>
<circle cx="{x-4}" cy="99"  r="3.4" fill="#fff"/>
```

Mouth (open + one white fang):

```
<path d="M84 148 Q100 172 116 148 Z" fill="#2a2320"/>
<path d="M94 148 L102 148 L98 158 Z" fill="#fff"/>
```

Patterns (all clipped to the body shape; dark = `darken(color, 0.44)`):

- **spots (blotches)** — r=16 circles at PER-SHAPE positions (tuned so spots stay visible and
  clear the face; do not reuse one layout across shapes):
  - round:    (100,52) (46,100) (154,100) (56,166) (144,166) (100,188)
  - ghost:    (100,50) (46,92) (154,92) (46,148) (154,148) (100,180)
  - teardrop: (100,54) (54,132) (146,132) (78,176) (122,176)
- **stripes** — 4 curved bands that wrap the body, stroke width 21:
  `for y in [50, 92, 134, 176]: <path d="M-24 {y} Q100 {y+17} 224 {y}" fill="none" stroke={dark} stroke-width="21"/>`

## Expressions (reactions layer — UI states, not attributes)

The resting face is the fang mouth above. For game feedback, swap ONLY the eyes/mouth:
- **Happy** (valid Set): mouth arc up-curved / wider grin; optional slight bounce animation.
- **Grumpy** (invalid): angled brows added + mouth flipped to frown; wobble/shake animation.
Exact happy/grumpy geometry is left to build (small variations of the mouth path), but must not
alter the four attribute channels.

## Known pitfalls (paid for in iteration — don't repeat)

- `<clipPath>` children must be raw shapes (a shape element with a `transform` attribute is fine);
  a `<g>` wrapper inside `<clipPath>` **silently clips everything away** in Chrome.
- Patterns must reach the silhouette edge (natural markings); outline redrawn on top. No inset rim.
- One blotch layout does NOT fit all silhouettes — use the per-shape coordinates above.
- Review art by rasterizing a static HTML grid with headless Chrome and *looking at it*.

Reference render of every attribute + a sample board: `blorb-reference-sheet.png`.
