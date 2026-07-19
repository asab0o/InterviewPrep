import { describe, expect, it } from "vitest";
import { jstToday } from "./jst";

describe("jstToday", () => {
  it("returns the JST calendar date, rolling over past UTC midnight (JST = UTC+9)", () => {
    // UTC 2026-07-18T15:30:00Z -> JST 2026-07-19T00:30:00+09:00
    expect(jstToday(new Date("2026-07-18T15:30:00Z"))).toBe("2026-07-19");
  });

  it("stays on the previous JST day just before the rollover", () => {
    // UTC 2026-07-18T14:59:59Z -> JST 2026-07-18T23:59:59+09:00
    expect(jstToday(new Date("2026-07-18T14:59:59Z"))).toBe("2026-07-18");
  });

  it("is independent of the server's local timezone (uses Asia/Tokyo explicitly)", () => {
    // UTC正午は日本時間では常に同日の21時台になる。
    expect(jstToday(new Date("2026-01-01T12:00:00Z"))).toBe("2026-01-01");
  });
});
