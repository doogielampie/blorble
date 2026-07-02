import { describe, expect, test } from "vitest";
import { formatDate, formatTime, shareText } from "./share";

describe("share", () => {
  test("formatTime", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(59_999)).toBe("0:59");
    expect(formatTime(60_000)).toBe("1:00");
    expect(formatTime(221_000)).toBe("3:41");
    expect(formatTime(3_729_000)).toBe("1:02:09");
  });

  test("formatDate is fixed-English, no locale drift", () => {
    expect(formatDate("2026-07-01")).toBe("Jul 1");
    expect(formatDate("2026-12-25")).toBe("Dec 25");
  });

  test("shareText: clean solve gets a sparkle", () => {
    expect(shareText({ label: "Blorblet", isoDate: "2026-07-02", elapsedMs: 161_000, hints: 0, wrongs: 0 }))
      .toBe("Blorblet · Jul 2 · ⏱ 2:41 · ✨");
  });
  test("shareText: hints and wrongs are shown, zero parts omitted", () => {
    expect(shareText({ label: "Blorble", isoDate: "2026-07-02", elapsedMs: 433_000, hints: 2, wrongs: 3 }))
      .toBe("Blorble · Jul 2 · ⏱ 7:13 · 💡2 ✖️3");
    expect(shareText({ label: "Blorble", isoDate: "2026-07-02", elapsedMs: 433_000, hints: 0, wrongs: 1 }))
      .toBe("Blorble · Jul 2 · ⏱ 7:13 · ✖️1");
    expect(shareText({ label: "Blorble", isoDate: "2026-07-02", elapsedMs: 433_000, hints: 1, wrongs: 0 }))
      .toBe("Blorble · Jul 2 · ⏱ 7:13 · 💡1");
  });
  test("shareText: practice replaces the date", () => {
    expect(shareText({ label: "Blorblet", isoDate: "2026-07-02", elapsedMs: 61_000, hints: 0, wrongs: 0, practice: true }))
      .toBe("Blorblet · practice · ⏱ 1:01 · ✨");
  });
});
