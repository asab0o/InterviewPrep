import { describe, expect, it } from "vitest";
import { toDateOnly, todayDateOnly } from "./dates";

describe("toDateOnly", () => {
  it("returns null for null/undefined input", () => {
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(toDateOnly("")).toBeNull();
  });

  it("returns null for an unparseable date string", () => {
    expect(toDateOnly("not-a-date")).toBeNull();
  });

  it("converts a plain UTC-midday ISO timestamp to the same calendar date (well clear of the JST boundary)", () => {
    expect(toDateOnly("2024-06-15T12:00:00Z")).toBe("2024-06-15");
  });

  // JST深夜（00:00〜08:59台）のコミットをUTC変換後に切り出すと前日にずれてしまう回帰バグの固定化。
  // "2024-01-01T00:30:00+09:00" は UTC では "2023-12-31T15:30:00Z" になるが、JST基準では
  // 引き続き 2024-01-01 でなければならない。
  it("keeps the JST calendar date for a commit made just after JST midnight (+09:00 offset notation)", () => {
    expect(toDateOnly("2024-01-01T00:30:00+09:00")).toBe("2024-01-01");
  });

  it("keeps the JST calendar date for the UTC-equivalent instant expressed with a trailing Z", () => {
    // "2024-01-01T00:30:00+09:00" と同一時刻をUTC表記(Z)にしたもの。
    expect(toDateOnly("2023-12-31T15:30:00Z")).toBe("2024-01-01");
  });

  it("stays on the previous JST day just before the JST midnight rollover", () => {
    // UTC 2023-12-31T14:59:59Z -> JST 2023-12-31T23:59:59+09:00
    expect(toDateOnly("2023-12-31T14:59:59Z")).toBe("2023-12-31");
  });

  it("rolls over to the next JST day exactly at JST midnight", () => {
    // UTC 2023-12-31T15:00:00Z -> JST 2024-01-01T00:00:00+09:00
    expect(toDateOnly("2023-12-31T15:00:00Z")).toBe("2024-01-01");
  });
});

describe("todayDateOnly", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayDateOnly()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
