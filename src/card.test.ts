import { describe, expect, test } from "vitest";
import { cardLines, quip } from "./card";

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

describe("cardLines", () => {
  test("clean solve: marksLine reads 'no hints, no misses'", () => {
    expect(cardLines({ label: "Blorble", isoDate: "2026-07-02", elapsedMs: 433_000, hints: 0, wrongs: 0 }))
      .toEqual(["no hints, no misses", "Blorble · Jul 2"]);
  });
  test("hints and wrongs both shown", () => {
    expect(cardLines({ label: "Blorblet", isoDate: "2026-07-02", elapsedMs: 161_000, hints: 2, wrongs: 1 }))
      .toEqual(["💡2 ✖️1", "Blorblet · Jul 2"]);
  });
  test("hints only", () => {
    expect(cardLines({ label: "Blorble", isoDate: "2026-07-05", elapsedMs: 90_000, hints: 1, wrongs: 0 }))
      .toEqual(["💡1", "Blorble · Jul 5"]);
  });
  test("wrongs only", () => {
    expect(cardLines({ label: "Blorble", isoDate: "2026-07-05", elapsedMs: 90_000, hints: 0, wrongs: 3 }))
      .toEqual(["✖️3", "Blorble · Jul 5"]);
  });
  test("practice: context line reads Practice · mode, no date", () => {
    expect(cardLines({ label: "Blorblet", isoDate: "2026-07-02", elapsedMs: 61_000, hints: 0, wrongs: 0, practice: true }))
      .toEqual(["no hints, no misses", "Practice · Blorblet"]);
  });
});
