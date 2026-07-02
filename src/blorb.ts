import type { Card } from "./deck";

// ======================= CANONICAL RENDERER =======================
// Ported VERBATIM from design/blorble/reference-renderer.html (locked
// 2026-07-01). The art is final — do not restyle or re-derive. Additions
// beyond the reference: TypeScript types and the expression parameter
// (eye/mouth swaps sanctioned by BLORB-SPEC.md "Expressions").
export const INK = "#2a2320";
export const COLORS: readonly string[] = ["#3f9fe0", "#f2953c", "#e56aa8"]; // blue / orange / pink

export type Expression = "rest" | "happy" | "grumpy";

const hx = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const darken = (h: string, f: number) => {
  const [r, g, b] = hx(h) as [number, number, number];
  return toHex(r * (1 - f), g * (1 - f), b * (1 - f));
};

// Body silhouettes: round / ghost / teardrop (curled tip). `a` = attribute string.
const SHAPES: readonly ((a: string) => string)[] = [
  (a) => `<circle cx="100" cy="116" r="78" ${a}/>`,
  (a) => `<path d="M30 160 C24 82 50 30 100 30 C150 30 176 82 170 160 C170 188 123 188 123 160 C123 188 77 188 77 160 C77 188 30 188 30 160 Z" ${a}/>`,
  (a) => `<path d="M112 30 C118 52 168 96 166 132 a66 66 0 1 1 -132 1 C34 96 82 52 94 42 C100 34 105 30 112 30 Z" ${a}/>`,
];
// Per-shape blotch layouts (r=16) — tuned so spots stay visible and clear the face.
const BLOTCH: readonly (readonly (readonly [number, number])[])[] = [
  [[100, 52], [46, 100], [154, 100], [56, 166], [144, 166], [100, 188]], // round
  [[100, 50], [46, 92], [154, 92], [46, 148], [154, 148], [100, 180]],   // ghost
  [[100, 54], [54, 132], [146, 132], [78, 176], [122, 176]],             // teardrop
];

const eyesSvg = (n: number): string => {
  const xs = Array.from({ length: n }, (_, i) => 100 + (i - (n - 1) / 2) * 42);
  return xs
    .map(
      (x) =>
        `<circle cx="${x}" cy="104" r="18" fill="#fff" stroke="${INK}" stroke-width="3"/>` +
        `<circle cx="${x + 1}" cy="106" r="9" fill="${INK}"/>` +
        `<circle cx="${x - 4}" cy="99" r="3.4" fill="#fff"/>`,
    )
    .join("");
};

// Grumpy brows: one per eye, slanting down toward the face centre
// (a downward V for a centred eye). Additive layer — attribute channels untouched.
const browsSvg = (n: number): string => {
  const xs = Array.from({ length: n }, (_, i) => 100 + (i - (n - 1) / 2) * 42);
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

// card = [colour 0-2, eyes 0-2 (renders 1-3), shape 0-2, pattern 0-2 (solid/spots/stripes)]
// uid must be unique per <svg> in the document (clipPath ids are document-global).
export const renderBlorb = (card: Card, uid: string, expression: Expression = "rest"): string => {
  const [ci, ei, si, pi] = card;
  const clip = `bclip-${uid}`;
  const color = COLORS[ci]!;
  const dk = darken(color, 0.44);
  const el = SHAPES[si]!;
  const pattern =
    pi === 1
      ? `<g clip-path="url(#${clip})">${BLOTCH[si]!.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="${dk}"/>`).join("")}</g>`
      : pi === 2
        ? `<g clip-path="url(#${clip})">${[50, 92, 134, 176].map((y) => `<path d="M-24 ${y} Q100 ${y + 17} 224 ${y}" fill="none" stroke="${dk}" stroke-width="21"/>`).join("")}</g>`
        : "";
  return (
    `<svg viewBox="0 0 200 214" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">` +
    // NOTE: clipPath children must be raw shapes — a <g> wrapper silently clips everything away.
    `<defs><clipPath id="${clip}">${el("")}</clipPath></defs>` +
    // 1. antennae (behind body)
    `<g stroke="${INK}" stroke-width="3" stroke-linecap="round"><line x1="84" y1="46" x2="72" y2="16"/><line x1="116" y1="46" x2="128" y2="16"/></g>` +
    `<circle cx="72" cy="13" r="6" fill="${INK}"/><circle cx="128" cy="13" r="6" fill="${INK}"/>` +
    // 2. body fill (no stroke)
    el(`fill="${color}"`) +
    // 3. pattern, clipped to the FULL body (markings reach the edge)
    pattern +
    // 4. crisp outline ON TOP (never covered by the pattern)
    el(`fill="none" stroke="${INK}" stroke-width="4.5"`) +
    // 5. face (expression swaps only eyes/mouth — never the attribute channels)
    eyesSvg(ei + 1) +
    (expression === "grumpy" ? browsSvg(ei + 1) : "") +
    MOUTHS[expression] +
    `</svg>`
  );
};
