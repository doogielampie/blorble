# Blorble Art v2 Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the LOCKED Blorb art v2 (antenna-tip channel: ball/star/leaf replaces pattern) from `design/blorble-v2/playground.html` into the live game, verbatim-faithfully, with all pinned tests, consumers, copy, docs, rasters, and deploy per the handoff DoD.

**Architecture:** `src/blorb.ts` is THE renderer — every consumer (board, minis, landing, legend, how-to, mascot, canvas stats-card, favicon) renders through `renderBlorb(card, uid, expression)`. The port swaps the renderer's internals wholesale (test-first), then touches the only consumer with hard-coded geometry (`src/card.ts`), renames the channel in user-facing copy, regenerates all raster checkpoints, and deploys.

**Tech Stack:** TypeScript strict + Vitest (`pnpm check`), Vite/GitHub Pages, headless-Chrome rasters (`tools/phone-shot.sh` for phone-size shots).

**User lock (2026-07-03):** Art LOCKED after 8 rounds + comprehensive review (3-agent workflow + full 81-deck/expressions/22px lock sheet). Micro-polish (eye sparkle recentring, leaf widening) explicitly declined — geometry below is verbatim from the locked playground.

## Global Constraints

- The art is LOCKED — port geometry verbatim from `design/blorble-v2/playground.html` (cute path); do not restyle, re-derive, or "improve".
- `renderBlorb(card: Card, uid: string, expression: Expression = "rest")` signature must not change; the tip style comes from `card[3]` (the playground took it as a separate arg — that must NOT be ported).
- `src/seed.ts`, `src/board.ts`, `src/state.ts` (storage key `blorble.v1`, v:2 schema), `src/share.ts` (share text format): byte-identical, do not touch.
- All four channels must stay readable at every size: board ~85–130px, found-slot minis 22–30px, landing ~55px, legend ~34px, how-to ~90px, mascot 110px, favicon ~32px.
- `pnpm check` (tsc strict + vitest) green at EVERY commit. Vitest on Node 25 sometimes exits SIGABRT after green output — rerun once before investigating.
- clipPath children must be raw shape elements (a `<g>` wrapper silently clips everything away in Chrome). `bclip-${uid}` AND `bshade-${uid}` are document-global ids — uid unique per `<svg>`.
- Phone-size UI rasters MUST use `tools/phone-shot.sh OUT.png W H "/blorble/?query" [PROFILE] [PORT]` (raw --window-size lies below 500px width; PNG is (W+200)×(H+200), judge top-left W×H). Static grids: plain `--headless=new --screenshot --window-size=940,H file://…` with `--user-data-dir=$(mktemp -d)`, run backgrounded, poll for file, kill chrome. Never screenshot the Vite dev server.
- Dev/raster URL params available: `?date=YYYY-MM-DD ?mode=blorblet|blorble ?autoplay=1 ?solve=N ?hint=1 ?practice=1 ?howto=1`.
- `design/blorble/` (v1) is history — do not modify. `design/blorble-v2/` becomes canonical.
- Global `pnpm` (no corepack). Commit style: `feat:` / `fix:` / `docs:` per repo history.

---

### Task 1: Port the locked renderer (src/blorb.ts + src/blorb.test.ts)

**Files:**
- Modify: `src/blorb.ts` (full replacement below)
- Modify: `src/blorb.test.ts` (full replacement below)

**Interfaces:**
- Consumes: `Card` from `src/deck.ts` (unchanged 4-tuple).
- Produces: `renderBlorb(card, uid, expression?)` (signature unchanged — all call sites keep working); exports `INK`, `COLORS` (unchanged values), NEW export `TIP_COLORS: readonly string[]` = `[INK, "#f0a91e", "#3fa346"]` (consumed by Task 2's CVD gate); type `Expression` unchanged.

- [ ] **Step 1: Replace `src/blorb.test.ts` with the new pins (write the failing tests first)**

```ts
import { describe, expect, test } from "vitest";
import { COLORS, renderBlorb } from "./blorb";

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("renderBlorb (canonical v2 port)", () => {
  test("svg root with canonical viewBox; ground shadow on every card", () => {
    const svg = renderBlorb([0, 0, 0, 0], "t");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 -10 200 224"');
    expect(svg).toContain('<ellipse cx="100" cy="206" rx="50" ry="7"'); // ground shadow
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  test("eye count follows the eyes attribute (1/2/3 whites of r=19)", () => {
    for (const e of [0, 1, 2] as const)
      expect(count(renderBlorb([0, e, 0, 0], "t"), /r="19"/g)).toBe(e + 1);
  });

  test("body colour follows the colour attribute", () => {
    for (const c of [0, 1, 2] as const)
      expect(renderBlorb([c, 0, 0, 0], "t")).toContain(`fill="${COLORS[c]}"`);
  });

  test("antenna-tip channel from card[3]: ball / star / leaf, two of each", () => {
    const ball = renderBlorb([0, 0, 0, 0], "t");
    expect(count(ball, /r="10" fill="#2a2320"/g)).toBe(2);
    expect(ball).not.toContain("#f0a91e");
    expect(ball).not.toContain("#3fa346");
    const star = renderBlorb([0, 0, 0, 1], "t");
    expect(count(star, /fill="#f0a91e"/g)).toBe(2);
    expect(star).not.toContain('r="10" fill="#2a2320"');
    const leaf = renderBlorb([0, 0, 0, 2], "t");
    expect(count(leaf, /fill="#3fa346"/g)).toBe(2);
    expect(leaf).not.toContain("#f0a91e");
  });

  test("antenna bases adapt per shape (teardrop attaches lower)", () => {
    expect(renderBlorb([0, 0, 0, 0], "t")).toContain('y1="50"'); // round
    expect(renderBlorb([0, 0, 1, 0], "t")).toContain('y1="48"'); // ghost
    expect(renderBlorb([0, 0, 2, 0], "t")).toContain('y1="74"'); // teardrop
  });

  test("layer order: shading use after body fill, outline after shading, eyes after outline", () => {
    const svg = renderBlorb([0, 0, 0, 0], "t");
    const body = svg.indexOf(`fill="${COLORS[0]}"`);
    const shade = svg.indexOf('fill="url(#bshade-t)"');
    const outline = svg.indexOf('stroke-width="4.5"');
    const eyes = svg.indexOf('r="19"');
    expect(body).toBeGreaterThan(-1);
    expect(body).toBeLessThan(shade);
    expect(shade).toBeLessThan(outline);
    expect(outline).toBeLessThan(eyes);
  });

  test("clip/shade ids unique per uid; clipPath children are raw shapes, not <g>", () => {
    expect(renderBlorb([0, 0, 0, 0], "a")).toContain('id="bclip-a"');
    expect(renderBlorb([0, 0, 0, 0], "a")).toContain('id="bshade-a"');
    expect(renderBlorb([0, 0, 0, 0], "b")).toContain('id="bclip-b"');
    expect(renderBlorb([0, 0, 0, 0], "a")).not.toMatch(/<clipPath[^>]*><g/);
  });
});

describe("expressions", () => {
  const REST_MOUTH = `<path d="M84 148 Q100 172 116 148 Z" fill="#2a2320"/><path d="M94 148 L102 148 L98 158 Z" fill="#fff"/>`;
  const HAPPY_MOUTH = `<path d="M76 144 Q100 182 124 144 Z" fill="#2a2320"/><path d="M93 144 L103 144 L98 158 Z" fill="#fff"/>`;
  const GRUMPY_MOUTH = `<path d="M84 164 Q100 142 116 164 Z" fill="#2a2320"/><path d="M94 164 L102 164 L98 155 Z" fill="#fff"/>`;

  test("happy differs from rest ONLY by the mouth (byte-exact)", () => {
    const rest = renderBlorb([1, 2, 1, 2], "t");
    expect(rest).toContain(REST_MOUTH);
    expect(renderBlorb([1, 2, 1, 2], "t", "happy")).toBe(rest.replace(REST_MOUTH, HAPPY_MOUTH));
  });

  test("grumpy = rest + brows + swapped mouth, nothing else (byte-exact)", () => {
    const rest = renderBlorb([1, 2, 1, 2], "t");
    const grumpy = renderBlorb([1, 2, 1, 2], "t", "grumpy");
    const noBrows = grumpy.replace(/<(?:line|path)[^>]*stroke-width="5"[^>]*\/>/g, "");
    expect(noBrows).toBe(rest.replace(REST_MOUTH, GRUMPY_MOUTH));
  });

  test("grumpy adds one brow per eye at the NEW 44px eye spacing", () => {
    const brows = (s: string) => (s.match(/stroke-width="5"/g) ?? []).length;
    expect(brows(renderBlorb([0, 0, 0, 0], "t", "grumpy"))).toBe(1);
    expect(brows(renderBlorb([0, 1, 0, 0], "t", "grumpy"))).toBe(2);
    expect(brows(renderBlorb([0, 2, 0, 0], "t", "grumpy"))).toBe(3);
    expect(brows(renderBlorb([0, 2, 0, 0], "t", "happy"))).toBe(0);
    // outer eyes of a 3-eye card sit at 100±44 → left brow line starts at 56-13=43
    expect(renderBlorb([0, 2, 0, 0], "t", "grumpy")).toContain('x1="43"');
  });
});
```

- [ ] **Step 2: Run to verify the new pins fail against the old renderer**

Run: `pnpm vitest run src/blorb.test.ts`
Expected: FAIL — old renderer emits `viewBox="0 0 200 214"`, `r="18"` eyes, blotch/stripe patterns.

- [ ] **Step 3: Replace `src/blorb.ts` with the ported renderer**

```ts
import type { Card } from "./deck";

// ======================= CANONICAL RENDERER (art v2) =======================
// Ported VERBATIM from design/blorble-v2/playground.html (locked 2026-07-03).
// The art is final — do not restyle or re-derive. v2 change: the 4th channel
// is the ANTENNA-TIP style (ball/star/leaf), replacing v1's pattern channel.
// The channel is carried by tip SILHOUETTE (ink disc / 10-point star / tilted
// leaf); the gold/green fills are reinforcement only, so it cannot collapse
// under colour-vision deficiency (see colors.cvd.test.ts).
export const INK = "#2a2320";
// CVD-adjusted 2026-07-01 (hex-only change sanctioned by BLORB-SPEC): the
// original blue #3f9fe0 / pink #e56aa8 collapse to ΔE≈19 under protanopia.
// src/colors.cvd.test.ts enforces the separation.
export const COLORS: readonly string[] = ["#1f97f0", "#f2953c", "#eb648c"]; // blue / orange / pink
// Tip trio: ball(ink) / star(gold) / leaf(green) — relaxed CVD gate in colors.cvd.test.ts.
export const TIP_COLORS: readonly string[] = [INK, "#f0a91e", "#3fa346"];

export type Expression = "rest" | "happy" | "grumpy";

// Body silhouettes: round / ghost / teardrop (curled tip). `a` = attribute string.
const SHAPES: readonly ((a: string) => string)[] = [
  (a) => `<circle cx="100" cy="116" r="78" ${a}/>`,
  (a) => `<path d="M30 160 C24 82 50 30 100 30 C150 30 176 82 170 160 C170 188 123 188 123 160 C123 188 77 188 77 160 C77 188 30 188 30 160 Z" ${a}/>`,
  (a) => `<path d="M112 30 C118 52 168 96 166 132 a66 66 0 1 1 -132 1 C34 96 82 52 94 42 C100 34 105 30 112 30 Z" ${a}/>`,
];

// 5-point star (outer r 14, inner r 7.7), points rounded via Catmull-Rom and
// BAKED to a literal for byte-stable pins — generator: design/blorble-v2/playground.html smoothPath.
const STAR_D =
  "M0.0 -14.0 C1.5 -14.0 2.3 -7.8 4.5 -6.2 C6.7 -4.6 12.8 -5.8 13.3 -4.3 C13.8 -2.9 8.2 -0.2 7.3 2.4 " +
  "C6.5 5.0 9.4 10.4 8.2 11.3 C7.0 12.2 2.7 7.7 0.0 7.7 C-2.7 7.7 -7.0 12.2 -8.2 11.3 C-9.4 10.4 -6.5 5.0 -7.3 2.4 " +
  "C-8.2 -0.2 -13.8 -2.9 -13.3 -4.3 C-12.8 -5.8 -6.7 -4.6 -4.5 -6.2 C-2.3 -7.8 -1.5 -14.0 0.0 -14.0 Z";

// Tip ornaments, one per channel value. Filled areas are matched (~300-320
// sq units: ball πr² 314 / star 317 / leaf fill 253 + 2px stroke ≈ 310) so no
// value reads "bigger" than the others. Leaf literal derives from len=18 w=13:
// bulge y = 2-len*0.6 = -8.8, tip y = 2-len = -16, vein to 5-len = -13.
const TIPS: readonly ((tx: number, ty: number, side: number) => string)[] = [
  (tx, ty) => `<circle cx="${tx}" cy="${ty}" r="10" fill="${INK}"/>`,
  (tx, ty, side) =>
    `<g transform="translate(${tx} ${ty}) rotate(${side < 0 ? -18 : 18})">` +
    `<path d="${STAR_D}" fill="${TIP_COLORS[1]}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></g>`,
  (tx, ty, side) =>
    `<g transform="translate(${tx} ${ty}) rotate(${side < 0 ? -22 : 22})">` +
    `<path d="M0 2 C -13 2 -13 -8.8 0 -16 C 13 -8.8 13 2 0 2 Z" fill="${TIP_COLORS[2]}" stroke="${INK}" stroke-width="2"/>` +
    `<line x1="0" y1="0" x2="0" y2="-13" stroke="${INK}" stroke-width="1.1" opacity="0.6"/></g>`,
];

// Antenna base attach points, tuned PER SHAPE so the base sits inside each
// silhouette (antennae render UNDER the body fill — the visible stalk appears
// to grow out of the head; the teardrop's narrow top needs a lower/narrower
// attach point or the stalk floats disconnected).
const ANTENNA_BASE: readonly { y: number; lx: number }[] = [
  { y: 50, lx: 76 }, // round
  { y: 48, lx: 74 }, // ghost
  { y: 74, lx: 80 }, // teardrop
];
const STALK_DX = 17;
const STALK_DY = 40;

const antennaeSvg = (si: number, ti: number): string => {
  const base = ANTENNA_BASE[si]!;
  return [-1, 1]
    .map((side) => {
      const bx = side < 0 ? base.lx : 200 - base.lx;
      const tx = side < 0 ? bx - STALK_DX : bx + STALK_DX;
      const ty = base.y - STALK_DY;
      return (
        `<line x1="${bx}" y1="${base.y}" x2="${tx}" y2="${ty}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` +
        TIPS[ti]!(tx, ty, side)
      );
    })
    .join("");
};

const eyesSvg = (n: number): string => {
  const xs = Array.from({ length: n }, (_, i) => 100 + (i - (n - 1) / 2) * 44);
  return xs
    .map(
      (x) =>
        `<circle cx="${x}" cy="105" r="19" fill="#fff" stroke="${INK}" stroke-width="3"/>` +
        `<circle cx="${x + 1}" cy="108" r="11" fill="${INK}"/>` +
        `<circle cx="${x - 5}" cy="98" r="4.3" fill="#fff"/>` +
        `<circle cx="${x + 6}" cy="113" r="1.9" fill="#fff" opacity="0.85"/>`,
    )
    .join("");
};

// Grumpy brows: one per eye, slanting down toward the face centre
// (a downward V for a centred eye). Additive layer — attribute channels
// untouched. Eye step 44 matches eyesSvg (v1 was 42; brow y-range 79-87 is
// unchanged — old and new eye tops are both y=86).
const browsSvg = (n: number): string => {
  const xs = Array.from({ length: n }, (_, i) => 100 + (i - (n - 1) / 2) * 44);
  const s = `stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"`;
  return xs
    .map((x) => {
      if (x < 100) return `<line x1="${x - 13}" y1="79" x2="${x + 11}" y2="87" ${s}/>`;
      if (x > 100) return `<line x1="${x - 11}" y1="87" x2="${x + 13}" y2="79" ${s}/>`;
      return `<path d="M${x - 13} 79 L${x} 87 L${x + 13} 79" ${s}/>`;
    })
    .join("");
};

// Resting fang mouth is canonical; happy/grumpy are sanctioned eye/mouth swaps.
const MOUTHS: Record<Expression, string> = {
  rest: `<path d="M84 148 Q100 172 116 148 Z" fill="${INK}"/><path d="M94 148 L102 148 L98 158 Z" fill="#fff"/>`,
  happy: `<path d="M76 144 Q100 182 124 144 Z" fill="${INK}"/><path d="M93 144 L103 144 L98 158 Z" fill="#fff"/>`,
  grumpy: `<path d="M84 164 Q100 142 116 164 Z" fill="${INK}"/><path d="M94 164 L102 164 L98 155 Z" fill="#fff"/>`,
};

// card = [colour 0-2, eyes 0-2 (renders 1-3), shape 0-2, antenna-tip 0-2 (ball/star/leaf)]
// uid must be unique per <svg> in the document (bclip-/bshade- ids are document-global).
export const renderBlorb = (card: Card, uid: string, expression: Expression = "rest"): string => {
  const [ci, ei, si, ti] = card;
  const clip = `bclip-${uid}`;
  const shade = `bshade-${uid}`;
  const color = COLORS[ci]!;
  const el = SHAPES[si]!;
  return (
    // viewBox top -10: worst ink is the ghost star/leaf tip at y≈-7.8 (+2 margin
    // for the star's curve overshoot). No wasted headroom at any consumer size.
    `<svg viewBox="0 -10 200 224" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">` +
    // NOTE: clipPath children must be raw shapes — a <g> wrapper silently clips everything away.
    `<defs><clipPath id="${clip}">${el("")}</clipPath>` +
    `<linearGradient id="${shade}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.10"/>` +
    `</linearGradient></defs>` +
    // 1. ground shadow (very back)
    `<ellipse cx="100" cy="206" rx="50" ry="7" fill="${INK}" opacity="0.15"/>` +
    // 2. antennae (base hidden under the body; tip = 4th channel)
    antennaeSvg(si, ti) +
    // 3. body fill (no stroke)
    el(`fill="${color}"`) +
    // 4. soft vertical shading, clipped to the FULL body silhouette
    `<g clip-path="url(#${clip})">${el(`fill="url(#${shade})"`)}</g>` +
    // 5. crisp outline ON TOP (never covered by the shading)
    el(`fill="none" stroke="${INK}" stroke-width="4.5"`) +
    // 6. face (expression swaps only eyes/mouth/brows — never the attribute channels)
    eyesSvg(ei + 1) +
    (expression === "grumpy" ? browsSvg(ei + 1) : "") +
    MOUTHS[expression] +
    `</svg>`
  );
};
```

- [ ] **Step 4: Run the renderer suite**

Run: `pnpm vitest run src/blorb.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Full check**

Run: `pnpm check`
Expected: PASS (tsc strict + all suites; colors.cvd.test.ts unaffected — it imports only `COLORS`). If vitest SIGABRTs after green output, rerun once.

- [ ] **Step 6: Commit**

```bash
git add src/blorb.ts src/blorb.test.ts
git commit -m "feat: art v2 — antenna-tip channel (ball/star/leaf) replaces patterns; refined body"
```

---

### Task 2: Relaxed CVD gate for the tip trio

**Files:**
- Modify: `src/colors.cvd.test.ts`

**Interfaces:**
- Consumes: `TIP_COLORS` from `src/blorb.ts` (Task 1); existing helpers `toLab`, `simulate`, `deltaE` in the same test file.

- [ ] **Step 1: Add the tip-trio gate to `src/colors.cvd.test.ts`**

Change the import line to `import { COLORS, TIP_COLORS } from "./blorb";` and append after the existing describe block:

```ts
// The antenna-tip channel is SILHOUETTE-coded (ink disc / 10-point star /
// tilted leaf) — colour is reinforcement only, so the gate is relaxed vs the
// body trio's ≥30. Measured: gold-vs-green ΔE 24.0 under protanopia is the
// floor case; ink-vs-either is ≥55 under both dichromacies.
describe("antenna-tip trio separation (relaxed gate — shape carries the channel)", () => {
  for (const mode of ["protan", "deutan"] as const) {
    test(`tip trio ΔE ≥ 20 under ${mode}opia`, () => {
      const labs = TIP_COLORS.map((c) => toLab(simulate(c, mode)));
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++)
          expect(deltaE(labs[i]!, labs[j]!), `${TIP_COLORS[i]} vs ${TIP_COLORS[j]} (${mode})`).toBeGreaterThanOrEqual(20);
    });
  }
});
```

- [ ] **Step 2: Run the gate**

Run: `pnpm vitest run src/colors.cvd.test.ts`
Expected: PASS (4 tests: 2 body + 2 tip). If the tip gate fails, STOP — the hexes in `TIP_COLORS` were transcribed wrong; do not lower the gate.

- [ ] **Step 3: Commit**

```bash
git add src/colors.cvd.test.ts
git commit -m "test: relaxed CVD gate for the antenna-tip trio (silhouette-coded channel)"
```

---

### Task 3: Stats-card mascot sizing (src/card.ts)

**Files:**
- Modify: `src/card.ts:68-76` and `src/card.ts:103-106`

**Interfaces:**
- Consumes: `renderBlorb` output (now 200×224 units). No API changes; internal canvas math only.

- [ ] **Step 1: Update the aspect-locked constants**

At `src/card.ts:68-76`, the comment and mascot maths reference 200×214. Replace that block with:

```ts
      // mascot, below the bubble, aspect-correct (source SVG is 200×224) so
      // antennae aren't squashed — drawn after the bubble so its bottom edge
      // (bubbleY + bubbleH = 150) never covers them, with a clear gap below it.
      const mascotW = 320;
      const mascotH = Math.round((mascotW * 224) / 200); // 358
      const mascotX = (800 - mascotW) / 2;
      const mascotY = bubbleY + bubbleH + 20; // 170 — ≥20px clear of the bubble
      ctx.drawImage(img, mascotX, mascotY, mascotW, mascotH);
      const mascotBottom = mascotY + mascotH; // 528
```

At `src/card.ts:105`, update the intrinsic-size injection:

```ts
    const sized = blorbSvg.replace("<svg ", '<svg width="200" height="224" ');
```

(The `-10` y-origin needs no special handling — width/height + viewBox scale together. Everything below the mascot is anchored to `mascotBottom` and shifts down 16px; the URL footer is fixed at y=950 on the 1000px canvas — the context line lands at 528+210=738, well clear.)

- [ ] **Step 2: Full check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/card.ts
git commit -m "fix: stats-card mascot maths for the 200×224 art v2 viewBox"
```

---

### Task 4: Channel rename in copy and comments

**Files:**
- Modify: `src/main.ts:99` (how-to sentence), `src/main.ts:104` (legend label)
- Modify: `src/deck.ts:1` (comment)
- Modify: `README.md:3,5,29`

**Interfaces:** none (copy only). Legend demo cards `[[0,1,0,0],[0,1,0,1],[0,1,0,2]]` stay valid — they now show ball/star/leaf.

- [ ] **Step 1: Rename in `src/main.ts`**

Line 99: `<p>Every Blorb has 4 features: colour, eyes, shape, and pattern.</p>` → `<p>Every Blorb has 4 features: colour, eyes, shape, and antennae.</p>`
Line 104: `legendRow("Pattern", "hp", ...)` → `legendRow("Antennae", "hp", ...)` (cards unchanged).

- [ ] **Step 2: Rename in `src/deck.ts:1`**

`// A Blorb card: [colour, eyes, shape, pattern], each attribute 0|1|2.` → `// A Blorb card: [colour, eyes, shape, antenna], each attribute 0|1|2.`

- [ ] **Step 3: Update `README.md`**

Line 3: `free daily pattern-matching puzzle` → `free daily monster-matching puzzle` (matches index.html's existing meta copy).
Line 5: `(colour, eye count, shape, pattern)` → `(colour, eye count, shape, antennae)`.
Line 29: `the canonical Blorb art spec lives in design/blorble/` → `the canonical Blorb art spec lives in design/blorble-v2/ (v1 history in design/blorble/)`.

- [ ] **Step 4: Full check + commit**

Run: `pnpm check` — Expected: PASS.

```bash
git add src/main.ts src/deck.ts README.md
git commit -m "docs: rename the 4th channel pattern→antennae in copy, comments, README"
```

---

### Task 5: Canonical v2 design folder (spec + reference sheet) + preview regeneration

**Files:**
- Create: `design/blorble-v2/BLORB-SPEC.md`
- Create: `design/blorble-v2/blorb-reference-sheet.png` (raster of the lock sheet)
- Regenerate: `preview/blorbs.html` (via `src/preview.test.ts`, no code change)

**Interfaces:** documentation of the geometry constants Task 1 shipped (TIPS, ANTENNA_BASE, STALK_DX/DY, viewBox).

- [ ] **Step 1: Write `design/blorble-v2/BLORB-SPEC.md`**

```markdown
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
```

- [ ] **Step 2: Save the reference sheet raster**

The lock-sheet PNG from the design session lives in the session scratchpad. Copy it:
```bash
cp "/private/tmp/claude-501/-Users-morrischang-Projects-blorble/2b7fb2ba-7758-412b-a102-e7e5bef42d04/scratchpad/lock-sheet.png" design/blorble-v2/blorb-reference-sheet.png
```
(If the scratchpad is gone, re-raster: `--headless=new --screenshot --window-size=980,3400 file://$PWD/design/blorble-v2/playground.html` shows the same art via the tip-topper section — any full re-raster of the playground is acceptable as the reference sheet since the playground is the locked source.)

- [ ] **Step 3: Regenerate the preview grid with the new renderer and raster it**

```bash
PREVIEW=1 pnpm vitest run src/preview.test.ts
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless=new --disable-gpu --hide-scrollbars \
  --screenshot=preview/deck-v2.png --window-size=940,2200 --user-data-dir=$(mktemp -d) \
  "file://$PWD/preview/blorbs.html" & 
# poll for preview/deck-v2.png, then: pkill -f "headless=new"
```
**LOOK gate:** compare `preview/deck-v2.png` against `design/blorble-v2/blorb-reference-sheet.png` — the 81-card deck and the rest/happy/grumpy expression row must match the locked art (this proves the port is faithful end-to-end, including expressions the playground never wired).

- [ ] **Step 4: Commit**

```bash
git add design/blorble-v2/BLORB-SPEC.md design/blorble-v2/blorb-reference-sheet.png design/blorble-v2/playground.html
git commit -m "docs: design/blorble-v2 canonical — locked spec + reference sheet"
```

---

### Task 6: Full UI raster verification (both phone sizes) + board-cap retune if needed

**Files:**
- Possibly modify: `src/style.css:75` (board `46dvh` cap — only if the taller cards overflow one screen)

**Interfaces:** none — verification task with one contingency fix.

- [ ] **Step 1: Shoot the full UI pass at 390×844**

```bash
bash tools/phone-shot.sh /tmp/v2art-landing.png 390 844 "/blorble/"
bash tools/phone-shot.sh /tmp/v2art-board.png 390 844 "/blorble/?mode=blorble&date=2026-07-01" 
bash tools/phone-shot.sh /tmp/v2art-blorblet.png 390 844 "/blorble/?mode=blorblet&date=2026-07-01"
bash tools/phone-shot.sh /tmp/v2art-howto.png 390 844 "/blorble/?howto=1"
bash tools/phone-shot.sh /tmp/v2art-result.png 390 844 "/blorble/?mode=blorblet&date=2026-07-01&autoplay=1"
```
Judge the top-left 390×844 of each. Checks: landing samples read; board fits ONE screen with header+hint+found slots (no vertical overflow); found-slot minis (30px) show tips clearly; legend row shows ball/star/leaf under "Antennae"; results dialog mascot + happy expression correct; favicon in any tab shot is recognisable (ground shadow may read as a base-line — acceptable; only flag if it looks like dirt).

- [ ] **Step 2: Repeat at 375×667**

Same five shots with `375 667`. Same checks (this is the short-phone worst case for the board cap).

- [ ] **Step 3 (contingency): retune the board cap only if the board overflows**

New aspect is 224/200 = 1.12 vs old 1.07 (+4.7% card height). If Step 1/2 shows overflow, edit `src/style.css:75`: `max-width: min(100%, 46dvh);` → `max-width: min(100%, 44dvh);` (46×1.07/1.12 ≈ 43.9) and re-shoot the board at both sizes. If no overflow, leave it.

- [ ] **Step 4: One real playthrough (game-feel check, from the design-session analysis)**

Run `pnpm build && pnpm vite preview` and play one practice round at phone width: confirm trio-scanning by antenna tips feels fine at board size, happy/grumpy flashes read, found minis register. (Kill the preview server after.)

- [ ] **Step 5: Full check + commit (only if style.css changed)**

Run: `pnpm check` — Expected: PASS.
```bash
git add src/style.css
git commit -m "fix: board dvh cap retuned for the taller v2 card aspect"
```

---

### Task 7: Deploy, live smoke, ledger + memory

**Files:**
- Modify: `.superpowers/sdd/progress.md` (append execution record, format per existing entries)
- Modify: `~/.claude/projects/-Users-morrischang-Projects-blorble/memory/blorble-v1-shipped.md` (art v2 note)

- [ ] **Step 1: Push and watch the deploy**

```bash
git push origin main
gh run watch --exit-status
```
Expected: Pages workflow green.

- [ ] **Step 2: Live smoke test**

```bash
bash tools/phone-shot.sh /tmp/v2art-live.png 390 844 "/blorble/"  # against the LIVE site URL if the script supports it; otherwise open https://doogielampie.github.io/blorble/ in Chrome via MCP and check
```
Checks: landing shows new art; play 1 practice trio; hard-refresh shows new favicon; a pre-existing mid-day save (if any) still loads (storage untouched).

- [ ] **Step 3: Ledger + memory**

Append to `.superpowers/sdd/progress.md` (match existing format):
```
=== ART V2 EXECUTION (plan: ~/.claude/plans/purrfect-strolling-lemon.md; LOCKED 2026-07-03 after 8 rounds + 3-agent review) ===
art-v2 Task 1-2: complete (renderer port + CVD tip gate, commits <sha>..<sha>)
art-v2 Task 3-4: complete (card.ts 224 sizing; pattern→antennae copy)
art-v2 Task 5: deck sheet vs lock sheet LOOK PASSED; design/blorble-v2 canonical
art-v2 Task 6: phone rasters PASSED at 390×844 + 375×667 (board cap <kept 46dvh|retuned 44dvh>)
=== ART V2 SHIPPED <date> → antenna-tip channel (ball/star/leaf), refined cute body ===
```
Update the memory file: art redesign session COMPLETE — 4th channel is now antenna-tip style (ball/star/leaf), `design/blorble-v2/` canonical, viewBox `0 -10 200 224`; update `MEMORY.md` index hook accordingly.

- [ ] **Step 4: Final commit**

```bash
git add .superpowers/sdd/progress.md
git commit -m "docs: art v2 execution ledger"
git push origin main
```

---

## Verification (end-to-end definition of done, from the handoff)

1. ~~User LOCKED~~ — done 2026-07-03 in chat.
2. `pnpm check` green (tsc strict + vitest incl. new pins + CVD gates) — Tasks 1–4.
3. Deck sheet + expressions raster vs locked reference (LOOK gate) — Task 5; full UI pass at 390×844 + 375×667 — Task 6.
4. Deployed, live smoke, ledger + memory updated, `design/blorble-v2/` canonical — Task 7.
