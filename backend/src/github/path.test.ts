import { describe, expect, it } from "vitest";
import { buildGithubPath, slugify } from "./path";

describe("slugify", () => {
  it("lowercases and hyphenates a plain title", () => {
    expect(slugify("Design Twitter")).toBe("design-twitter");
  });

  it("collapses consecutive non-alphanumeric characters into a single hyphen", () => {
    expect(slugify("Two Sum II - Input Array Is Sorted")).toBe("two-sum-ii-input-array-is-sorted");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  !!!Edge Case!!!  ")).toBe("edge-case");
  });

  it("keeps digits", () => {
    expect(slugify("3Sum")).toBe("3sum");
  });

  // customTitleはユーザー入力からGitHub上のファイルパスの一部（buildGithubPathのslug）に
  // 直接使われるため、パス脱出に使える `.` `/` `\` がslugifyの出力に一切残らないことを固定する。
  it("does not leak path-traversal characters ('.', '/') for a '../../etc/passwd'-style input", () => {
    const result = slugify("../../etc/passwd");
    expect(result).toBe("etc-passwd");
    expect(result).not.toMatch(/[./\\]/);
  });

  it("does not leak path separator characters ('/', '\\\\') for a mixed-slash input", () => {
    const result = slugify("a/b\\c");
    expect(result).toBe("a-b-c");
    expect(result).not.toMatch(/[./\\]/);
  });

  it("never produces a leading hyphen even for an all-punctuation input (would otherwise look like a CLI flag / hidden path segment)", () => {
    expect(slugify("../../../")).toBe("");
  });
});

describe("buildGithubPath", () => {
  it("omits the attempt suffix for the first attempt", () => {
    const path = buildGithubPath({ categorySlug: "two-pointers", number: 125, slug: "valid-palindrome", attemptNumber: 1 });
    expect(path).toBe("problems/two-pointers/125-valid-palindrome.md");
  });

  it("appends -{attemptNumber} for the second and later attempts", () => {
    const path = buildGithubPath({ categorySlug: "two-pointers", number: 125, slug: "valid-palindrome", attemptNumber: 2 });
    expect(path).toBe("problems/two-pointers/125-valid-palindrome-2.md");
  });

  it("supports custom (non-master) problems with a generated slug", () => {
    const path = buildGithubPath({ categorySlug: "linked-list", number: 9999, slug: slugify("Design Twitter"), attemptNumber: 1 });
    expect(path).toBe("problems/linked-list/9999-design-twitter.md");
  });
});
