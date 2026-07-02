import { describe, expect, test } from "vitest";
import { COLORS, renderBlorb } from "./blorb";

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("renderBlorb (canonical port)", () => {
  test("svg root with canonical viewBox", () => {
    const svg = renderBlorb([0, 0, 0, 0], "t");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 200 214"');
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  test("eye count follows the eyes attribute (1/2/3 whites of r=18)", () => {
    for (const e of [0, 1, 2] as const)
      expect(count(renderBlorb([0, e, 0, 0], "t"), /r="18"/g)).toBe(e + 1);
  });

  test("body colour follows the colour attribute", () => {
    for (const c of [0, 1, 2] as const)
      expect(renderBlorb([c, 0, 0, 0], "t")).toContain(`fill="${COLORS[c]}"`);
  });

  test("patterns: solid unclipped, per-shape blotch counts, 4 stripe bands", () => {
    expect(renderBlorb([0, 0, 0, 0], "t")).not.toContain("clip-path");
    expect(count(renderBlorb([0, 0, 0, 1], "t"), /r="16"/g)).toBe(6); // round
    expect(count(renderBlorb([0, 0, 1, 1], "t"), /r="16"/g)).toBe(6); // ghost
    expect(count(renderBlorb([0, 0, 2, 1], "t"), /r="16"/g)).toBe(5); // teardrop
    expect(count(renderBlorb([0, 0, 0, 2], "t"), /stroke-width="21"/g)).toBe(4);
  });

  test("outline is drawn after the pattern (never covered)", () => {
    const svg = renderBlorb([0, 0, 0, 2], "t");
    expect(svg.indexOf('stroke-width="21"')).toBeLessThan(svg.indexOf('stroke-width="4.5"'));
  });

  test("clipPath ids unique per uid; children are raw shapes, not <g>", () => {
    expect(renderBlorb([0, 0, 0, 1], "a")).toContain('id="bclip-a"');
    expect(renderBlorb([0, 0, 0, 1], "b")).toContain('id="bclip-b"');
    expect(renderBlorb([0, 0, 0, 1], "a")).not.toMatch(/<clipPath[^>]*><g/);
  });
});
