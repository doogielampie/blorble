import { describe, expect, test } from "vitest";
import { formatDate, formatTime, preferShareSheet, shareText } from "./share";

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
    expect(shareText({ label: "Blorblet", isoDate: "2026-07-02", elapsedMs: 161_000, hints: 0, wrongs: 0, size: 9, sets: 4 }))
      .toBe("Blorblet · Jul 2 · ⏱ 2:41 · ✨");
  });
  test("shareText: hints and wrongs are shown, zero parts omitted", () => {
    expect(shareText({ label: "Blorble", isoDate: "2026-07-02", elapsedMs: 433_000, hints: 2, wrongs: 3, size: 12, sets: 6 }))
      .toBe("Blorble · Jul 2 · ⏱ 7:13 · 💡2 ✖️3");
    expect(shareText({ label: "Blorble", isoDate: "2026-07-02", elapsedMs: 433_000, hints: 0, wrongs: 1, size: 12, sets: 6 }))
      .toBe("Blorble · Jul 2 · ⏱ 7:13 · ✖️1");
    expect(shareText({ label: "Blorble", isoDate: "2026-07-02", elapsedMs: 433_000, hints: 1, wrongs: 0, size: 12, sets: 6 }))
      .toBe("Blorble · Jul 2 · ⏱ 7:13 · 💡1");
  });
  test("shareText: practice replaces the date", () => {
    expect(shareText({ label: "Blorblet", isoDate: "2026-07-02", elapsedMs: 61_000, hints: 0, wrongs: 0, practice: true, size: 9, sets: 4 }))
      .toBe("Blorblet · practice · ⏱ 1:01 · ✨");
  });

  // Regression: desktop Chrome reports canShare({files}) = true, but its
  // share popover opens in browser chrome (easy to miss) and the pending
  // share() ate the first "Copy image" click. The share sheet is a
  // touch-device affordance — desktop must go straight to the clipboard.
  test("preferShareSheet: OS share sheet only on coarse-pointer devices", () => {
    expect(preferShareSheet(true, true)).toBe(true); // phone/tablet with file share
    expect(preferShareSheet(true, false)).toBe(false); // DESKTOP despite canShare=true
    expect(preferShareSheet(false, true)).toBe(false); // touch but no file share
  });
});
