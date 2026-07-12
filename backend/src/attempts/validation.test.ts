import { describe, expect, it } from "vitest";
import { attemptInputSchema, attemptListQuerySchema } from "./validation";

describe("attempt validation", () => {
  it("rejects impossible calendar dates", () => {
    const result = attemptInputSchema.safeParse({ date: "2026-02-30", problemId: 1, phrases: [] });
    expect(result.success).toBe(false);
  });

  it("requires a title for custom problems", () => {
    const result = attemptInputSchema.safeParse({ date: "2026-07-12", problemId: null, phrases: [] });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate phrase ids", () => {
    const result = attemptInputSchema.safeParse({
      date: "2026-07-12",
      problemId: 1,
      phrases: [
        { id: 1, englishText: "one", japaneseText: "一" },
        { id: 1, englishText: "two", japaneseText: "二" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("coerces numeric list filters", () => {
    expect(attemptListQuerySchema.parse({ categoryId: "2", problemId: "3" })).toEqual({ categoryId: 2, problemId: 3 });
  });
});
