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
