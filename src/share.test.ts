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

  test("shareText is spoiler-free, date for daily, marked for practice", () => {
    expect(shareText("2026-07-01", 221_000)).toBe("Blorble · Jul 1 · ⏱ 3:41");
    expect(shareText("2026-07-01", 221_000, true)).toBe("Blorble · practice · ⏱ 3:41");
  });
});
