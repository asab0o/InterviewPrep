import { describe, expect, it } from "vitest";
import { buildUmpirePrompt, UMPIRE_PROMPT_TEMPLATE } from "./prompt";

describe("buildUmpirePrompt", () => {
  it("replaces the placeholder with the given problem statement", () => {
    const prompt = buildUmpirePrompt("Given an array nums, return the two indices...");

    expect(prompt).not.toContain("[PASTE LEETCODE PROBLEM HERE]");
    expect(prompt).toContain("Given an array nums, return the two indices...");
    expect(prompt.endsWith("Given an array nums, return the two indices...")).toBe(true);
  });

  it("keeps the rest of the appendix B prompt text unchanged", () => {
    const prompt = buildUmpirePrompt("Two Sum problem statement");

    expect(prompt).toContain("You are a senior software engineer interviewer and English speaking coach.");
    expect(prompt).toContain("- Generate all sections: Understand, Match, Plan, Implement, Review, Evaluate.");
    expect(prompt).toContain("O(n log n) (Big O n log n)");
    expect(prompt).toContain("Now generate the UMPIRE interview script for the following problem:");
  });

  it("uses [PASTE LEETCODE PROBLEM HERE] as the placeholder in the template", () => {
    expect(UMPIRE_PROMPT_TEMPLATE).toContain("[PASTE LEETCODE PROBLEM HERE]");
    expect(UMPIRE_PROMPT_TEMPLATE.endsWith("[PASTE LEETCODE PROBLEM HERE]")).toBe(true);
  });
});
