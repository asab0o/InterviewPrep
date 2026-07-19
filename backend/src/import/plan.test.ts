import { describe, expect, it } from "vitest";
import { buildAttemptDedupeKey, buildImportPlan, type LegacyFileEntry, type MasterCategoryLookup, type MasterProblemLookup } from "./plan";

const categories: MasterCategoryLookup[] = [
  { id: 1, slug: "two-pointers" },
  { id: 2, slug: "linked-list" },
];

const problemsMaster: MasterProblemLookup[] = [
  { id: 10, categoryId: 1, number: 125, title: "Valid Palindrome" },
  { id: 11, categoryId: 2, number: 21, title: "Merge Two Sorted Lists" },
];

function file(folderSlug: string, filename: string, date: string): LegacyFileEntry {
  return { folderSlug, filename, date };
}

describe("buildImportPlan", () => {
  it("links a new-format file to the master problem by number", () => {
    const plan = buildImportPlan(
      [file("two-pointers", "125-valid-palindrome.md", "2025-01-01")],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.skipped).toEqual([]);
    expect(plan.warnings).toEqual([]);
    expect(plan.toInsert).toEqual([{
      sourceFile: "two-pointers/125-valid-palindrome.md",
      date: "2025-01-01",
      attemptNumber: 1,
      isMaster: true,
      problemId: 10,
      categoryId: 1,
      categorySlug: "two-pointers",
      number: 125,
      title: "Valid Palindrome",
      customTitle: null,
      customNumber: null,
    }]);
  });

  it("links an old-format (Obsidian-era) file to the master problem by number", () => {
    const plan = buildImportPlan(
      [file("linked-list", "21. Merge Two Sorted Lists.md", "2024-06-01")],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.toInsert).toEqual([expect.objectContaining({
      isMaster: true,
      problemId: 11,
      number: 21,
      title: "Merge Two Sorted Lists",
      attemptNumber: 1,
    })]);
  });

  it("treats a number not present in the master as a custom (non-master) attempt", () => {
    const plan = buildImportPlan(
      [file("linked-list", "9999-design-twitter.md", "2025-02-01")],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.toInsert).toEqual([{
      sourceFile: "linked-list/9999-design-twitter.md",
      date: "2025-02-01",
      attemptNumber: 1,
      isMaster: false,
      problemId: null,
      categoryId: 2,
      categorySlug: "linked-list",
      number: 9999,
      title: "Design Twitter",
      customTitle: "Design Twitter",
      customNumber: 9999,
    }]);
  });

  it("skips files in a folder with no matching category and reports the reason", () => {
    const plan = buildImportPlan(
      [file("dynamic-programming", "70-climbing-stairs.md", "2025-01-01")],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.toInsert).toEqual([]);
    expect(plan.skipped).toEqual([{
      sourceFile: "dynamic-programming/70-climbing-stairs.md",
      reason: "unknown_category",
      detail: expect.stringContaining("dynamic-programming"),
    }]);
  });

  it("skips unparseable filenames and continues processing the rest", () => {
    const plan = buildImportPlan(
      [
        file("two-pointers", "notes.md", "2025-01-01"),
        file("two-pointers", "125-valid-palindrome.md", "2025-01-02"),
      ],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.toInsert).toHaveLength(1);
    expect(plan.skipped).toEqual([{
      sourceFile: "two-pointers/notes.md",
      reason: "unparseable_filename",
      detail: expect.any(String),
    }]);
  });

  it("uses the explicit trailing attempt number from the filename when present", () => {
    const plan = buildImportPlan(
      [
        file("two-pointers", "125-valid-palindrome.md", "2025-01-01"),
        file("two-pointers", "125-valid-palindrome-2.md", "2025-03-01"),
      ],
      categories,
      problemsMaster,
      new Set(),
    );

    const attemptNumbers = plan.toInsert.map((item) => item.attemptNumber).sort();
    expect(attemptNumbers).toEqual([1, 2]);
  });

  it("assigns attemptNumber by chronological order of appearance for master files with no explicit suffix", () => {
    const plan = buildImportPlan(
      [
        // 意図的にファイル一覧の順序を日付の昇順と逆にする（スキャン順ではなく日付順で採番されることを検証）。
        file("two-pointers", "21. Merge Two Sorted Lists.md", "2025-03-01"),
        file("linked-list", "21. Merge Two Sorted Lists.md", "2024-01-01"),
      ],
      categories,
      problemsMaster,
      new Set(),
    );

    const byDate = new Map(plan.toInsert.map((item) => [item.date, item.attemptNumber]));
    expect(byDate.get("2024-01-01")).toBe(1);
    expect(byDate.get("2025-03-01")).toBe(2);
  });

  it("assigns implicit attempt numbers around an explicit one, avoiding a collision", () => {
    const plan = buildImportPlan(
      [
        // 明示的な "-2" と、連番なしのファイルが1つ。連番なしは1になるべき（2は既に予約済み）。
        file("two-pointers", "125-valid-palindrome-2.md", "2025-01-10"),
        file("two-pointers", "125-valid-palindrome.md", "2025-01-01"),
      ],
      categories,
      problemsMaster,
      new Set(),
    );

    const byDate = new Map(plan.toInsert.map((item) => [item.date, item.attemptNumber]));
    expect(byDate.get("2025-01-10")).toBe(2);
    expect(byDate.get("2025-01-01")).toBe(1);
  });

  it("skips a master attempt whose logical key already exists in the DB (idempotency)", () => {
    const existingKeys = new Set([
      buildAttemptDedupeKey({ isMaster: true, categoryId: 1, number: 125, attemptNumber: 1 }),
    ]);

    const plan = buildImportPlan(
      [file("two-pointers", "125-valid-palindrome.md", "2025-01-01")],
      categories,
      problemsMaster,
      existingKeys,
    );

    expect(plan.toInsert).toEqual([]);
    expect(plan.skipped).toEqual([{
      sourceFile: "two-pointers/125-valid-palindrome.md",
      reason: "duplicate",
      detail: expect.any(String),
    }]);
  });

  it("skips a custom (non-master) attempt whose logical key already exists in the DB, keyed by customTitle", () => {
    const existingKeys = new Set([
      buildAttemptDedupeKey({ isMaster: false, categoryId: 2, customTitle: "Design Twitter", attemptNumber: 1 }),
    ]);

    const plan = buildImportPlan(
      [file("linked-list", "9999-design-twitter.md", "2025-01-01")],
      categories,
      problemsMaster,
      existingKeys,
    );

    expect(plan.toInsert).toEqual([]);
    expect(plan.skipped[0]).toMatchObject({ reason: "duplicate" });
  });

  it("de-duplicates within the same batch when two scanned files resolve to the identical logical key", () => {
    const plan = buildImportPlan(
      [
        // 同一問題に対して "-2" を名乗るファイルが2つ存在するデータ異常ケース（両方とも明示連番のため
        // 登場順での自動採番による回避が効かず、2件目は冪等キーの重複としてスキップされるべき）。
        file("two-pointers", "125-valid-palindrome-2.md", "2025-01-01"),
        file("linked-list", "125-valid-palindrome-2.md", "2025-01-02"),
      ],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0]).toMatchObject({ attemptNumber: 2, date: "2025-01-01" });
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0]).toMatchObject({ reason: "duplicate", sourceFile: "linked-list/125-valid-palindrome-2.md" });
  });

  it("warns (but still imports) when a master-matched file's folder does not match the master problem's category", () => {
    // 125 Valid Palindrome のマスタ側カテゴリーは two-pointers だが、誤って linked-list フォルダに置かれている。
    const plan = buildImportPlan(
      [file("linked-list", "125-valid-palindrome.md", "2025-01-01")],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.warnings).toEqual([{
      sourceFile: "linked-list/125-valid-palindrome.md",
      detail: expect.stringContaining("two-pointers"),
    }]);
    // importはスキップせず続行し、categorySlug/categoryIdはフォルダではなくマスタ側（実効値）を採用する
    // （--dry-run出力とDB実効値を一致させるため）。
    expect(plan.toInsert).toEqual([expect.objectContaining({
      categoryId: 1,
      categorySlug: "two-pointers",
      problemId: 10,
    })]);
    expect(plan.skipped).toEqual([]);
  });

  it("does not warn when the master-matched file's folder matches the master problem's category", () => {
    const plan = buildImportPlan(
      [file("two-pointers", "125-valid-palindrome.md", "2025-01-01")],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.warnings).toEqual([]);
  });

  it("does not warn about category mismatch for a custom (non-master) attempt (categoryId always comes from the folder)", () => {
    const plan = buildImportPlan(
      [file("linked-list", "9999-design-twitter.md", "2025-01-01")],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.warnings).toEqual([]);
  });

  it("does not re-run master and custom attempts into the same group even with equal attemptNumbers", () => {
    const plan = buildImportPlan(
      [
        file("two-pointers", "125-valid-palindrome.md", "2025-01-01"), // master
        file("linked-list", "9999-design-twitter.md", "2025-01-01"), // custom
      ],
      categories,
      problemsMaster,
      new Set(),
    );

    expect(plan.toInsert).toHaveLength(2);
    expect(plan.toInsert.every((item) => item.attemptNumber === 1)).toBe(true);
  });
});

describe("buildAttemptDedupeKey", () => {
  it("produces distinct keys for master vs custom attempts with otherwise identical fields", () => {
    const masterKey = buildAttemptDedupeKey({ isMaster: true, categoryId: 1, number: 1, attemptNumber: 1 });
    const customKey = buildAttemptDedupeKey({ isMaster: false, categoryId: 1, customTitle: "1", attemptNumber: 1 });
    expect(masterKey).not.toBe(customKey);
  });
});
