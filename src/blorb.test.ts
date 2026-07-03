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
