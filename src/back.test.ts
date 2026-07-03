import { describe, expect, test } from "vitest";
import { cardBackSvg } from "./back";
import { renderBlorb } from "./blorb";

const dOf = (svg: string) => /d="([^"]+)"/.exec(svg)?.[1];

describe("cardBackSvg (fresh-daily curtain backs)", () => {
  test("pale silhouette, no face: #e7dfd3 fill, no eye whites, no ink", () => {
    for (const i of [0, 1, 2]) {
      const svg = cardBackSvg(i);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain('fill="#e7dfd3"');
      expect(svg).not.toContain('r="19"');   // no eye whites
      expect(svg).not.toContain("#2a2320");  // no ink anywhere
    }
  });

  test("cycles the three silhouettes by board index — never the real card's shape", () => {
    expect(cardBackSvg(0)).toBe(cardBackSvg(3));
    expect(cardBackSvg(1)).toBe(cardBackSvg(4));
    expect(cardBackSvg(2)).toBe(cardBackSvg(5));
    expect(cardBackSvg(0)).not.toBe(cardBackSvg(1));
    expect(cardBackSvg(1)).not.toBe(cardBackSvg(2));
  });

  // blorb.ts is LOCKED and does not export SHAPES, so back.ts carries literal
  // copies — this pin catches any drift between the two.
  test("silhouette geometry matches the locked renderer's body paths", () => {
    expect(cardBackSvg(0)).toContain('<circle cx="100" cy="116" r="78"');
    expect(renderBlorb([0, 0, 0, 0], "t0")).toContain('<circle cx="100" cy="116" r="78"');
    for (const si of [1, 2] as const) {
      const d = dOf(cardBackSvg(si));
      expect(d).toBeTruthy();
      expect(renderBlorb([0, 0, si, 0], `t${si}`)).toContain(d!);
    }
  });
});
