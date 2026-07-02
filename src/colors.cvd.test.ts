import { describe, expect, test } from "vitest";
import { COLORS } from "./blorb";

// Dichromacy simulation — Viénot, Brettel & Mollon (1999) linear-RGB matrices
// as published by DaltonLens (https://daltonlens.org). Gate: the three body
// colours must stay mutually distinguishable for protanopes and deuteranopes.
const MAT = {
  protan: [[0.10889, 0.89111, 0], [0.10889, 0.89111, 0], [0.00447, -0.00447, 1]],
  deutan: [[0.29031, 0.70969, 0], [0.29031, 0.70969, 0], [-0.02197, 0.02197, 1]],
} as const;

const s2l = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const hexToLinear = (h: string) =>
  [1, 3, 5].map((i) => s2l(parseInt(h.slice(i, i + 2), 16))) as [number, number, number];

const toLab = ([r, g, b]: [number, number, number]) => {
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X / 0.95047), f(Y), f(Z / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)] as [number, number, number];
};

const simulate = (hex: string, mode: keyof typeof MAT): [number, number, number] => {
  const lin = hexToLinear(hex);
  return MAT[mode].map((row) => row[0]! * lin[0] + row[1]! * lin[1] + row[2]! * lin[2]) as [number, number, number];
};

const deltaE = (a: [number, number, number], b: [number, number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("colour-vision-deficiency separation (BLORB-SPEC: adjust hexes only)", () => {
  for (const mode of ["protan", "deutan"] as const) {
    test(`trio stays mutually distinguishable under ${mode}opia (ΔE ≥ 30)`, () => {
      const labs = COLORS.map((c) => toLab(simulate(c, mode)));
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++)
          expect(deltaE(labs[i]!, labs[j]!), `${COLORS[i]} vs ${COLORS[j]} (${mode})`).toBeGreaterThanOrEqual(30);
    });
  }
});
