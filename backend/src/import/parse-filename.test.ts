import { describe, expect, it } from "vitest";
import { parseLegacyFilename, titleFromSlug } from "./parse-filename";

describe("parseLegacyFilename", () => {
  it("parses the new format without a retry suffix", () => {
    const result = parseLegacyFilename("125-valid-palindrome.md");
    expect(result).toEqual({ ok: true, parsed: { kind: "new", number: 125, slug: "valid-palindrome" } });
  });

  it("parses the new format with a retry suffix", () => {
    const result = parseLegacyFilename("125-valid-palindrome-2.md");
    expect(result).toEqual({
      ok: true,
      parsed: { kind: "new", number: 125, slug: "valid-palindrome", attemptNumber: 2 },
    });
  });

  it("does not mistake a slug that happens to start with a digit for a retry suffix", () => {
    const result = parseLegacyFilename("15-3sum.md");
    expect(result).toEqual({ ok: true, parsed: { kind: "new", number: 15, slug: "3sum" } });
  });

  it("parses a retry suffix on a numeric-looking slug", () => {
    const result = parseLegacyFilename("15-3sum-2.md");
    expect(result).toEqual({ ok: true, parsed: { kind: "new", number: 15, slug: "3sum", attemptNumber: 2 } });
  });

  it("does not mistake a slug ending in a non-numeric word for a retry suffix", () => {
    const result = parseLegacyFilename("74-search-a-2d-matrix.md");
    expect(result).toEqual({ ok: true, parsed: { kind: "new", number: 74, slug: "search-a-2d-matrix" } });
  });

  it("parses the old (Obsidian-era) format with a space-separated title", () => {
    const result = parseLegacyFilename("21. Merge Two Sorted Lists.md");
    expect(result).toEqual({ ok: true, parsed: { kind: "old", number: 21, title: "Merge Two Sorted Lists" } });
  });

  it("trims surrounding whitespace from the old format title", () => {
    const result = parseLegacyFilename("21.   Merge Two Sorted Lists  .md");
    expect(result).toEqual({ ok: true, parsed: { kind: "old", number: 21, title: "Merge Two Sorted Lists" } });
  });

  it("returns ok:false for a file with no recognizable number prefix", () => {
    const result = parseLegacyFilename("notes.md");
    expect(result.ok).toBe(false);
  });

  it("returns ok:false for a non-markdown file", () => {
    const result = parseLegacyFilename("125-valid-palindrome.txt");
    expect(result.ok).toBe(false);
  });

  it("returns ok:false for a new-format file with an empty slug", () => {
    const result = parseLegacyFilename("125-.md");
    expect(result.ok).toBe(false);
  });
});

describe("titleFromSlug", () => {
  it("capitalizes each hyphen-separated word", () => {
    expect(titleFromSlug("valid-palindrome")).toBe("Valid Palindrome");
  });

  it("handles a single-word slug", () => {
    expect(titleFromSlug("3sum")).toBe("3sum");
  });
});
