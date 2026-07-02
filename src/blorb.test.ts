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

describe("expressions", () => {
  const REST_MOUTH = `<path d="M84 148 Q100 172 116 148 Z" fill="#2a2320"/><path d="M94 148 L102 148 L98 158 Z" fill="#fff"/>`;
  const HAPPY_MOUTH = `<path d="M76 144 Q100 182 124 144 Z" fill="#2a2320"/><path d="M93 144 L103 144 L98 158 Z" fill="#fff"/>`;
  const GRUMPY_MOUTH = `<path d="M84 164 Q100 142 116 164 Z" fill="#2a2320"/><path d="M94 164 L102 164 L98 155 Z" fill="#fff"/>`;

  test("happy differs from rest ONLY by the mouth (byte-exact)", () => {
    const rest = renderBlorb([1, 2, 1, 2], "t");
    expect(rest).toContain(REST_MOUTH); // canonical rest mouth stays verbatim
    expect(renderBlorb([1, 2, 1, 2], "t", "happy")).toBe(rest.replace(REST_MOUTH, HAPPY_MOUTH));
  });

  test("grumpy = rest + brows + swapped mouth, nothing else (byte-exact)", () => {
    const rest = renderBlorb([1, 2, 1, 2], "t");
    const grumpy = renderBlorb([1, 2, 1, 2], "t", "grumpy");
    const noBrows = grumpy.replace(/<(?:line|path)[^>]*stroke-width="5"[^>]*\/>/g, "");
    expect(noBrows).toBe(rest.replace(REST_MOUTH, GRUMPY_MOUTH));
  });

  test("grumpy adds one brow per eye; other expressions have none", () => {
    const brows = (s: string) => (s.match(/stroke-width="5"/g) ?? []).length;
    expect(brows(renderBlorb([0, 0, 0, 0], "t", "grumpy"))).toBe(1);
    expect(brows(renderBlorb([0, 1, 0, 0], "t", "grumpy"))).toBe(2);
    expect(brows(renderBlorb([0, 2, 0, 0], "t", "grumpy"))).toBe(3);
    expect(brows(renderBlorb([0, 2, 0, 0], "t", "happy"))).toBe(0);
  });
});
