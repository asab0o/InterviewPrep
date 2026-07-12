import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../db/schema";
import { attempts, categories, phrases, problems } from "../db/schema";
import { seedDatabase } from "../db/seed-service";
import { ApiError } from "../errors";
import type { GithubClient } from "./client";
import { GithubService } from "./service";

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeEach(() => {
  sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  seedDatabase(db);
});

afterEach(() => sqlite.close());

function mockClient(overrides: Partial<GithubClient> = {}): GithubClient {
  return {
    getFile: vi.fn(async () => null),
    putFile: vi.fn(async () => ({ commitUrl: "https://github.com/asab0o/leetcode-interview-prep/commit/abc123", sha: "new-sha" })),
    ...overrides,
  };
}

function validPalindromeId(): number {
  const row = db.select({ id: problems.id }).from(problems).where(eq(problems.number, 125)).get();
  if (!row) throw new Error("Seed problem missing");
  return row.id;
}

function categoryId(slug: string): number {
  const row = db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).get();
  if (!row) throw new Error("Seed category missing");
  return row.id;
}

function insertMasterAttempt(overrides: Partial<typeof attempts.$inferInsert> = {}) {
  return db.insert(attempts).values({
    date: "2026-07-12",
    problemId: validPalindromeId(),
    attemptNumber: 1,
    code: "function isPalindrome(s) {}",
    retrospective: "境界ケースを見落とした",
    ...overrides,
  }).returning({ id: attempts.id }).get().id;
}

function insertCustomAttempt(overrides: Partial<typeof attempts.$inferInsert> = {}) {
  return db.insert(attempts).values({
    date: "2026-07-12",
    problemId: null,
    customTitle: "Design Twitter",
    attemptNumber: 1,
    code: "class Twitter {}",
    ...overrides,
  }).returning({ id: attempts.id }).get().id;
}

describe("GithubService.check", () => {
  it("computes the master problem path without a suffix for the first attempt", async () => {
    const attemptId = insertMasterAttempt({ attemptNumber: 1 });
    const client = mockClient();
    const service = new GithubService(client, db);

    const result = await service.check(attemptId);

    expect(result.path).toBe("problems/two-pointers/125-valid-palindrome.md");
    expect(client.getFile).toHaveBeenCalledWith("problems/two-pointers/125-valid-palindrome.md");
  });

  it("appends the attempt number suffix for the second attempt", async () => {
    const attemptId = insertMasterAttempt({ attemptNumber: 2 });
    const service = new GithubService(mockClient(), db);

    const result = await service.check(attemptId);

    expect(result.path).toBe("problems/two-pointers/125-valid-palindrome-2.md");
  });

  it("computes a slugified path for a custom (non-master) problem", async () => {
    const attemptId = insertCustomAttempt({ customNumber: 9999, categoryId: categoryId("linked-list") });
    const service = new GithubService(mockClient(), db);

    const result = await service.check(attemptId);

    expect(result.path).toBe("problems/linked-list/9999-design-twitter.md");
  });

  it("reports exists=false when the GitHub file is not found", async () => {
    const attemptId = insertMasterAttempt();
    const service = new GithubService(mockClient({ getFile: vi.fn(async () => null) }), db);

    const result = await service.check(attemptId);
    expect(result.exists).toBe(false);
  });

  it("reports exists=true when the GitHub file is found", async () => {
    const attemptId = insertMasterAttempt();
    const service = new GithubService(mockClient({ getFile: vi.fn(async () => ({ sha: "abc" })) }), db);

    const result = await service.check(attemptId);
    expect(result.exists).toBe(true);
  });

  it("reports createdByApp=true when an attempt already recorded this githubPath", async () => {
    const attemptId = insertMasterAttempt({ attemptNumber: 1 });
    const path = "problems/two-pointers/125-valid-palindrome.md";
    db.update(attempts).set({ githubPath: path, githubPushed: true }).where(eq(attempts.id, attemptId)).run();

    const service = new GithubService(mockClient({ getFile: vi.fn(async () => ({ sha: "abc" })) }), db);
    const result = await service.check(attemptId);

    expect(result.createdByApp).toBe(true);
  });

  it("reports createdByApp=false when no attempt recorded this githubPath (e.g. an existing Obsidian file)", async () => {
    const attemptId = insertMasterAttempt();
    const service = new GithubService(mockClient({ getFile: vi.fn(async () => ({ sha: "abc" })) }), db);

    const result = await service.check(attemptId);
    expect(result.createdByApp).toBe(false);
  });

  it("throws 404 ATTEMPT_NOT_FOUND for an unknown attempt id", async () => {
    const service = new GithubService(mockClient(), db);
    await expect(service.check(999_999)).rejects.toMatchObject({ status: 404, code: "ATTEMPT_NOT_FOUND" });
  });

  it("throws 400 CATEGORY_REQUIRED for a custom problem with no category", async () => {
    const attemptId = insertCustomAttempt({ customNumber: 9999, categoryId: null });
    const service = new GithubService(mockClient(), db);

    await expect(service.check(attemptId)).rejects.toMatchObject({ status: 400, code: "CATEGORY_REQUIRED" });
  });

  it("throws 400 NUMBER_REQUIRED for a custom problem with a category but no custom number", async () => {
    const attemptId = insertCustomAttempt({ categoryId: categoryId("linked-list"), customNumber: null });
    const service = new GithubService(mockClient(), db);

    await expect(service.check(attemptId)).rejects.toMatchObject({ status: 400, code: "NUMBER_REQUIRED" });
  });

  it("throws 400 TITLE_REQUIRED for a custom problem with a category/number but a null customTitle", async () => {
    const attemptId = insertCustomAttempt({
      categoryId: categoryId("linked-list"),
      customNumber: 9999,
      customTitle: null,
    });
    const service = new GithubService(mockClient(), db);

    await expect(service.check(attemptId)).rejects.toMatchObject({ status: 400, code: "TITLE_REQUIRED" });
  });

  it("throws 400 TITLE_REQUIRED for a custom problem with a blank/whitespace-only customTitle (does not fall through to slugify)", async () => {
    const attemptId = insertCustomAttempt({
      categoryId: categoryId("linked-list"),
      customNumber: 9999,
      customTitle: "   ",
    });
    const service = new GithubService(mockClient(), db);

    await expect(service.check(attemptId)).rejects.toMatchObject({ status: 400, code: "TITLE_REQUIRED" });
  });

  it("throws 503 GITHUB_UNAVAILABLE when no client is configured", async () => {
    const attemptId = insertMasterAttempt();
    const service = new GithubService(null, db);

    await expect(service.check(attemptId)).rejects.toMatchObject({ status: 503, code: "GITHUB_UNAVAILABLE" });
  });

  it("wraps unexpected getFile failures as 502 GITHUB_CHECK_FAILED", async () => {
    const attemptId = insertMasterAttempt();
    const service = new GithubService(mockClient({ getFile: vi.fn(async () => { throw new Error("network error"); }) }), db);

    const error = await service.check(attemptId).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "GITHUB_CHECK_FAILED" });
  });
});

describe("GithubService.push", () => {
  it("creates a new file and persists githubPushed/githubPath on success", async () => {
    const attemptId = insertMasterAttempt();
    db.insert(phrases).values({ attemptId, englishText: "edge case", japaneseText: "境界ケース" }).run();

    const putFile = vi.fn(async () => ({ commitUrl: "https://github.com/asab0o/leetcode-interview-prep/commit/abc123", sha: "new-sha" }));
    const service = new GithubService(mockClient({ getFile: vi.fn(async () => null), putFile }), db);

    const result = await service.push(attemptId, undefined, false);

    expect(result).toEqual({
      path: "problems/two-pointers/125-valid-palindrome.md",
      commitUrl: "https://github.com/asab0o/leetcode-interview-prep/commit/abc123",
      sha: "new-sha",
    });
    expect(putFile).toHaveBeenCalledWith(
      "problems/two-pointers/125-valid-palindrome.md",
      expect.stringContaining("# 125. Valid Palindrome (Attempt 1)"),
      expect.stringContaining("Add "),
      undefined,
    );
    expect(putFile.mock.calls[0]![1]).toContain("- edge case → 境界ケース");

    const stored = db.select().from(attempts).where(eq(attempts.id, attemptId)).get();
    expect(stored?.githubPushed).toBe(true);
    expect(stored?.githubPath).toBe("problems/two-pointers/125-valid-palindrome.md");
  });

  it("pushes the caller-supplied content verbatim when provided, bypassing server-built markdown", async () => {
    const attemptId = insertMasterAttempt();
    const putFile = vi.fn(async () => ({ commitUrl: "https://github.com/x/y/commit/z", sha: "s" }));
    const service = new GithubService(mockClient({ getFile: vi.fn(async () => null), putFile }), db);

    await service.push(attemptId, "# custom edited content", false);

    expect(putFile).toHaveBeenCalledWith(expect.any(String), "# custom edited content", expect.any(String), undefined);
  });

  it("returns 409 FILE_EXISTS when the file exists and force is not set", async () => {
    const attemptId = insertMasterAttempt({ attemptNumber: 1 });
    const path = "problems/two-pointers/125-valid-palindrome.md";
    db.update(attempts).set({ githubPath: path, githubPushed: true }).where(eq(attempts.id, attemptId)).run();

    const service = new GithubService(mockClient({ getFile: vi.fn(async () => ({ sha: "existing-sha" })) }), db);

    await expect(service.push(attemptId, undefined, false)).rejects.toMatchObject({ status: 409, code: "FILE_EXISTS" });
  });

  it("updates an existing app-managed file when force is true, using its sha", async () => {
    const path = "problems/two-pointers/125-valid-palindrome.md";
    const attemptId = insertMasterAttempt({ githubPath: path, githubPushed: true });

    const putFile = vi.fn(async () => ({ commitUrl: "https://github.com/x/y/commit/z", sha: "updated-sha" }));
    const service = new GithubService(mockClient({ getFile: vi.fn(async () => ({ sha: "existing-sha" })), putFile }), db);

    const result = await service.push(attemptId, undefined, true);

    expect(putFile).toHaveBeenCalledWith(path, expect.any(String), expect.stringContaining("Update "), "existing-sha");
    expect(result.sha).toBe("updated-sha");
  });

  it("returns 409 FILE_NOT_APP_MANAGED for an existing file not tracked by any attempt, even with force=true", async () => {
    const attemptId = insertMasterAttempt();
    const putFile = vi.fn();
    const service = new GithubService(mockClient({ getFile: vi.fn(async () => ({ sha: "obsidian-sha" })), putFile }), db);

    await expect(service.push(attemptId, undefined, true)).rejects.toMatchObject({ status: 409, code: "FILE_NOT_APP_MANAGED" });
    expect(putFile).not.toHaveBeenCalled();
  });

  it("returns 400 CATEGORY_REQUIRED for a custom problem with no category, without calling GitHub", async () => {
    const attemptId = insertCustomAttempt({ customNumber: 9999, categoryId: null });
    const getFile = vi.fn();
    const service = new GithubService(mockClient({ getFile }), db);

    await expect(service.push(attemptId, undefined, false)).rejects.toMatchObject({ status: 400, code: "CATEGORY_REQUIRED" });
    expect(getFile).not.toHaveBeenCalled();
  });

  it("returns 400 NUMBER_REQUIRED for a custom problem with a category but no custom number", async () => {
    const attemptId = insertCustomAttempt({ categoryId: categoryId("linked-list"), customNumber: null });
    const service = new GithubService(mockClient(), db);

    await expect(service.push(attemptId, undefined, false)).rejects.toMatchObject({ status: 400, code: "NUMBER_REQUIRED" });
  });

  it("returns 400 TITLE_REQUIRED for a custom problem with a null customTitle, without calling GitHub", async () => {
    const attemptId = insertCustomAttempt({
      categoryId: categoryId("linked-list"),
      customNumber: 9999,
      customTitle: null,
    });
    const getFile = vi.fn();
    const service = new GithubService(mockClient({ getFile }), db);

    await expect(service.push(attemptId, undefined, false)).rejects.toMatchObject({ status: 400, code: "TITLE_REQUIRED" });
    expect(getFile).not.toHaveBeenCalled();
  });

  it("returns 503 GITHUB_UNAVAILABLE when no client is configured", async () => {
    const attemptId = insertMasterAttempt();
    const service = new GithubService(null, db);

    await expect(service.push(attemptId, undefined, false)).rejects.toMatchObject({ status: 503, code: "GITHUB_UNAVAILABLE" });
  });

  it("returns 404 ATTEMPT_NOT_FOUND for an unknown attempt id", async () => {
    const service = new GithubService(mockClient(), db);
    await expect(service.push(999_999, undefined, false)).rejects.toMatchObject({ status: 404, code: "ATTEMPT_NOT_FOUND" });
  });

  it("wraps putFile failures as 502 GITHUB_PUSH_FAILED without leaking internal details", async () => {
    const attemptId = insertMasterAttempt();
    const service = new GithubService(mockClient({
      getFile: vi.fn(async () => null),
      putFile: vi.fn(async () => { throw new Error("token abc123 invalid"); }),
    }), db);

    const error = await service.push(attemptId, undefined, false).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "GITHUB_PUSH_FAILED" });
    expect((error as ApiError).message).not.toContain("token abc123");
  });

  it("does not update the DB when the push fails", async () => {
    const attemptId = insertMasterAttempt();
    const service = new GithubService(mockClient({
      getFile: vi.fn(async () => null),
      putFile: vi.fn(async () => { throw new Error("network error"); }),
    }), db);

    await service.push(attemptId, undefined, false).catch(() => undefined);

    const stored = db.select().from(attempts).where(eq(attempts.id, attemptId)).get();
    expect(stored?.githubPushed).toBe(false);
    expect(stored?.githubPath).toBeNull();
  });
});
