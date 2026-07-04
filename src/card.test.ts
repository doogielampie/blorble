import { describe, expect, test } from "vitest";
import { quip, receiptModel } from "./card";

describe("quip", () => {
  test("deterministic: same (isoDate, label, outcome) always returns the same line", () => {
    const info = { isoDate: "2026-07-02", label: "Blorble", hints: 0, wrongs: 0 };
    expect(quip(info)).toBe(quip({ ...info }));
  });

  test("clean solve (no hints, no wrongs) picks from the CLEAN pool", () => {
    expect(quip({ isoDate: "2026-07-01", label: "Blorble", hints: 0, wrongs: 0 })).toBe("clean blorbing!");
    expect(quip({ isoDate: "2026-07-04", label: "Blorble", hints: 0, wrongs: 0 })).toBe("flawless. the Blorbs bow.");
    expect(quip({ isoDate: "2026-07-06", label: "Blorble", hints: 0, wrongs: 0 })).toBe("not a single grump.");
  });

  test("hints used (hints > 0) picks from the HINTY pool regardless of wrongs", () => {
    expect(quip({ isoDate: "2026-07-01", label: "Blorblet", hints: 1, wrongs: 0 })).toBe("the bulb did its part.");
    expect(quip({ isoDate: "2026-07-02", label: "Blorblet", hints: 2, wrongs: 3 })).toBe("hints were consumed.");
    expect(quip({ isoDate: "2026-07-03", label: "Blorblet", hints: 1, wrongs: 0 })).toBe("a little help never hurt.");
  });

  test("no hints but wrongs > 0 picks from the WRONGY pool", () => {
    expect(quip({ isoDate: "2026-07-04", label: "Blorble", hints: 0, wrongs: 1 })).toBe("the Blorbs forgive you.");
    expect(quip({ isoDate: "2026-07-06", label: "Blorble", hints: 0, wrongs: 2 })).toBe("grumps happened.");
    expect(quip({ isoDate: "2026-07-01", label: "Blorble", hints: 0, wrongs: 4 })).toBe("a scenic route!");
  });
});

describe("receiptModel", () => {
  const base = { label: "Blorble", isoDate: "2026-07-03", elapsedMs: 348_000, size: 12, sets: 6 };

  test("daily, hints + grumps: title, size line, itemised rows, date, url", () => {
    const m = receiptModel({ ...base, hints: 1, wrongs: 2 });
    expect(m.title).toBe("BLORBLE");
    expect(m.size).toBe("12 Blorbs · 6 Pods");
    expect(m.rows).toEqual([
      { label: "PODS FOUND", value: "6 / 6" },
      { label: "HINTS", value: "x 1" },
      { label: "GRUMPS", value: "x 2" },
    ]);
    expect(m.time).toBe("5:48");
    expect(m.note).toBe("thank you for blorbing");
    expect(m.date).toBe("Jul 3");
    expect(m.url).toBe("doogielampie.github.io/blorble");
  });

  test("Blorblet clean solve: zero counts still listed, title + size reflect the small mode", () => {
    const m = receiptModel({ label: "Blorblet", isoDate: "2026-07-03", elapsedMs: 112_000, hints: 0, wrongs: 0, size: 9, sets: 4 });
    expect(m.title).toBe("BLORBLET");
    expect(m.size).toBe("9 Blorbs · 4 Pods");
    expect(m.rows).toEqual([
      { label: "PODS FOUND", value: "4 / 4" },
      { label: "HINTS", value: "x 0" },
      { label: "GRUMPS", value: "x 0" },
    ]);
    expect(m.time).toBe("1:52");
    expect(m.date).toBe("Jul 3");
  });

  test("practice: date slot reads 'practice'", () => {
    expect(receiptModel({ ...base, hints: 0, wrongs: 0, practice: true }).date).toBe("practice");
  });

  test("quip is the deterministic performance line", () => {
    const info = { ...base, hints: 1, wrongs: 0 };
    expect(receiptModel(info).quip).toBe(quip(info));
  });
});
