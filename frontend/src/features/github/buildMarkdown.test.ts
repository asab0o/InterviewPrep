import { describe, expect, it } from "vitest";
import { buildMarkdown, type MarkdownAttempt } from "./buildMarkdown";

// これらのテストケースは backend/src/github/markdown.test.ts と入力を揃えており、同じ入力に対して
// 同じ出力になることを確認する（フロント／バックエンドの二重実装のズレを検知するため）。
const base: MarkdownAttempt = {
  number: 125,
  title: "Valid Palindrome",
  attemptNumber: 1,
  date: "2026-07-12",
  code: "function isPalindrome(s) {\n  return true;\n}",
  phrases: [{ englishText: "edge case", japaneseText: "境界ケース" }],
  retrospective: "ポインタの更新を忘れた",
};

describe("buildMarkdown", () => {
  it("renders the full template with all sections", () => {
    const markdown = buildMarkdown(base);

    expect(markdown).toBe(
      "# 125. Valid Palindrome (Attempt 1) — 2026-07-12\n\n" +
      "## Code\n\n```\nfunction isPalindrome(s) {\n  return true;\n}\n```\n\n" +
      "## English\n- edge case → 境界ケース\n\n" +
      "## Could Not Do\nポインタの更新を忘れた\n",
    );
  });

  it("includes the attempt number suffix in the heading for re-attempts", () => {
    const markdown = buildMarkdown({ ...base, attemptNumber: 3 });
    expect(markdown).toContain("(Attempt 3)");
  });

  it("lists multiple phrases as separate bullet points", () => {
    const markdown = buildMarkdown({
      ...base,
      phrases: [
        { englishText: "edge case", japaneseText: "境界ケース" },
        { englishText: "two pointers", japaneseText: "二重ポインタ" },
      ],
    });

    expect(markdown).toContain("## English\n- edge case → 境界ケース\n- two pointers → 二重ポインタ");
  });

  it("omits the English heading when phrases are empty", () => {
    const markdown = buildMarkdown({ ...base, phrases: [] });
    expect(markdown).not.toContain("## English");
  });

  it("omits the Could Not Do heading when retrospective is null", () => {
    const markdown = buildMarkdown({ ...base, retrospective: null });
    expect(markdown).not.toContain("## Could Not Do");
  });

  it("omits the Could Not Do heading when retrospective is an empty/blank string", () => {
    const markdown = buildMarkdown({ ...base, retrospective: "   " });
    expect(markdown).not.toContain("## Could Not Do");
  });

  it("omits the Code heading when code is null", () => {
    const markdown = buildMarkdown({ ...base, code: null });
    expect(markdown).not.toContain("## Code");
  });

  it("omits the Code heading when code is an empty/blank string", () => {
    const markdown = buildMarkdown({ ...base, code: "   " });
    expect(markdown).not.toContain("## Code");
  });

  it("never includes UMPIRE explanation content (not part of the template at all)", () => {
    const markdown = buildMarkdown(base);
    expect(markdown).not.toContain("UMPIRE");
  });

  // フロント固有：number が null の場合の防御（実運用ではcheck成功後にのみ呼ばれるため到達しない想定）。
  it("omits the number prefix in the heading when number is null", () => {
    const markdown = buildMarkdown({ ...base, number: null });
    expect(markdown).toContain("# Valid Palindrome (Attempt 1) — 2026-07-12");
    expect(markdown).not.toMatch(/^# \d/);
  });
});
