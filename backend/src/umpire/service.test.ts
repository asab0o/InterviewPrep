import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../db/schema";
import { problems } from "../db/schema";
import { seedDatabase } from "../db/seed-service";
import { ApiError } from "../errors";
import { UmpireService } from "./service";

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

function getValidPalindromeId(): number {
  const row = db.select({ id: problems.id }).from(problems).where(eq(problems.number, 125)).get();
  if (!row) throw new Error("Seed problem missing");
  return row.id;
}

describe("UmpireService.generateForProblem", () => {
  it("returns the cached explanation without invoking the generate function", async () => {
    const problemId = getValidPalindromeId();
    db.update(problems).set({
      umpireExplanation: "Existing explanation",
      umpireGeneratedAt: new Date("2026-07-01T00:00:00Z"),
    }).where(eq(problems.id, problemId)).run();

    const generateFn = vi.fn(async () => "should not be called");
    const service = new UmpireService(generateFn, db);

    const result = await service.generateForProblem(problemId, "problem statement text", false);

    expect(generateFn).not.toHaveBeenCalled();
    expect(result).toEqual({
      umpireExplanation: "Existing explanation",
      cached: true,
      generatedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("generates and persists a new explanation when none is cached", async () => {
    const problemId = getValidPalindromeId();
    const generateFn = vi.fn(async (statement: string) => `explanation for: ${statement}`);
    const service = new UmpireService(generateFn, db);

    const result = await service.generateForProblem(problemId, "problem statement text", false);

    expect(generateFn).toHaveBeenCalledWith(expect.stringContaining("problem statement text"));
    expect(result.cached).toBe(false);
    expect(result.umpireExplanation).toBe("explanation for: problem statement text");
    expect(new Date(result.generatedAt).toString()).not.toBe("Invalid Date");

    const stored = db.select().from(problems).where(eq(problems.id, problemId)).get();
    expect(stored?.umpireExplanation).toBe("explanation for: problem statement text");
    expect(stored?.umpireGeneratedAt).toBeInstanceOf(Date);
  });

  it("passes the raw problem statement through to the injected generate function", async () => {
    // プロンプト（付録B）の組み立てはcreateAnthropicUmpireFn側の責務（service.prompt.test.ts参照）。
    // UmpireServiceは生成関数へproblemStatementをそのまま渡すだけでよい。
    const problemId = getValidPalindromeId();
    const generateFn = vi.fn(async () => "generated");
    const service = new UmpireService(generateFn, db);

    await service.generateForProblem(problemId, "MY PROBLEM STATEMENT", false);

    expect(generateFn).toHaveBeenCalledWith("MY PROBLEM STATEMENT");
  });

  it("regenerates and overwrites the cache when force is true", async () => {
    const problemId = getValidPalindromeId();
    db.update(problems).set({
      umpireExplanation: "Old explanation",
      umpireGeneratedAt: new Date("2026-07-01T00:00:00Z"),
    }).where(eq(problems.id, problemId)).run();

    const generateFn = vi.fn(async () => "New explanation");
    const service = new UmpireService(generateFn, db);

    const result = await service.generateForProblem(problemId, "problem statement text", true);

    expect(generateFn).toHaveBeenCalledOnce();
    expect(result.cached).toBe(false);
    expect(result.umpireExplanation).toBe("New explanation");

    const stored = db.select().from(problems).where(eq(problems.id, problemId)).get();
    expect(stored?.umpireExplanation).toBe("New explanation");
  });

  it("throws 404 PROBLEM_NOT_FOUND for an unknown problem id", async () => {
    const generateFn = vi.fn(async () => "generated");
    const service = new UmpireService(generateFn, db);

    await expect(service.generateForProblem(999_999, "statement", false)).rejects.toMatchObject({
      status: 404,
      code: "PROBLEM_NOT_FOUND",
    });
    expect(generateFn).not.toHaveBeenCalled();
  });

  it("throws 503 UMPIRE_UNAVAILABLE when no generate function is configured", async () => {
    const problemId = getValidPalindromeId();
    const service = new UmpireService(null, db);

    await expect(service.generateForProblem(problemId, "statement", false)).rejects.toMatchObject({
      status: 503,
      code: "UMPIRE_UNAVAILABLE",
    });
  });

  it("wraps generate function failures as a 502 without leaking internal details", async () => {
    const problemId = getValidPalindromeId();
    const generateFn = vi.fn(async () => {
      throw new Error("anthropic said no (internal detail: api key xyz)");
    });
    const service = new UmpireService(generateFn, db);

    const error = await service.generateForProblem(problemId, "statement", false).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "UMPIRE_FAILED" });
    expect((error as ApiError).message).not.toContain("api key");
  });

  it("never persists a partial/truncated explanation when the generate function throws (e.g. max_tokens truncation)", async () => {
    const problemId = getValidPalindromeId();
    const generateFn = vi.fn(async () => {
      throw new Error("Anthropic response was truncated (stop_reason=max_tokens)");
    });
    const service = new UmpireService(generateFn, db);

    await expect(service.generateForProblem(problemId, "statement", false)).rejects.toMatchObject({
      status: 502,
      code: "UMPIRE_FAILED",
    });

    const stored = db.select().from(problems).where(eq(problems.id, problemId)).get();
    expect(stored?.umpireExplanation).toBeNull();
    expect(stored?.umpireGeneratedAt).toBeNull();
  });
});

describe("UmpireService.preview", () => {
  it("generates an explanation without persisting it", async () => {
    const problemId = getValidPalindromeId();
    const generateFn = vi.fn(async (statement: string) => `preview for: ${statement}`);
    const service = new UmpireService(generateFn, db);

    const result = await service.preview("some problem statement");

    expect(result.umpireExplanation).toBe("preview for: some problem statement");
    expect(new Date(result.generatedAt).toString()).not.toBe("Invalid Date");

    const stored = db.select().from(problems).where(eq(problems.id, problemId)).get();
    expect(stored?.umpireExplanation).toBeNull();
  });

  it("throws 503 UMPIRE_UNAVAILABLE when no generate function is configured", async () => {
    const service = new UmpireService(null, db);

    await expect(service.preview("statement")).rejects.toMatchObject({
      status: 503,
      code: "UMPIRE_UNAVAILABLE",
    });
  });

  it("wraps generate function failures as a 502 without leaking internal details", async () => {
    const generateFn = vi.fn(async () => {
      throw new Error("network error with secret token abc");
    });
    const service = new UmpireService(generateFn, db);

    const error = await service.preview("statement").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "UMPIRE_FAILED" });
    expect((error as ApiError).message).not.toContain("secret token");
  });
});
