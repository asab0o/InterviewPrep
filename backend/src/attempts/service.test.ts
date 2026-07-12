import Database from "better-sqlite3";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { attempts, categories, phrases, problems } from "../db/schema";
import { seedDatabase } from "../db/seed-service";
import { ApiError } from "../errors";
import { AttemptService } from "./service";
import type { AttemptInput } from "./validation";

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let service: AttemptService;

const baseInput = (problemId: number): AttemptInput => ({
  date: "2026-07-12",
  problemId,
  code: "function solve() {}",
  phrases: [{ englishText: "edge case", japaneseText: "境界ケース" }],
});

beforeEach(() => {
  sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  seedDatabase(db);
  service = new AttemptService(db);
});

afterEach(() => sqlite.close());

function problemId(number: number): number {
  const problem = db.select({ id: problems.id }).from(problems).where(eq(problems.number, number)).get();
  if (!problem) throw new Error("Seed problem missing");
  return problem.id;
}

describe("AttemptService", () => {
  it("creates master attempts with automatic attempt numbers and nested phrases", () => {
    const validPalindromeId = problemId(125);
    const first = service.create(baseInput(validPalindromeId));
    const second = service.create({ ...baseInput(validPalindromeId), date: "2026-07-13" });

    expect(first.attemptNumber).toBe(1);
    expect(first.title).toBe("Valid Palindrome");
    expect(first.categorySlug).toBe("two-pointers");
    expect(first.phrases).toHaveLength(1);
    expect(second.attemptNumber).toBe(2);
  });

  it("numbers custom attempts by exact custom title", () => {
    const custom: AttemptInput = {
      date: "2026-07-12",
      problemId: null,
      customTitle: "My Custom Problem",
      customNumber: 9999,
      phrases: [],
    };

    expect(service.create(custom).attemptNumber).toBe(1);
    expect(service.create(custom).attemptNumber).toBe(2);
    expect(service.create({ ...custom, customTitle: "Another Problem" }).attemptNumber).toBe(1);
  });

  it("lists attempts newest first and filters by resolved category", () => {
    const validPalindromeId = problemId(125);
    const twoSumId = problemId(1);
    service.create(baseInput(validPalindromeId));
    service.create({ ...baseInput(twoSumId), date: "2026-07-14", videoUrl: "https://youtu.be/example" });
    const twoPointers = db.select().from(categories).where(eq(categories.slug, "two-pointers")).get();
    if (!twoPointers) throw new Error("Seed category missing");

    const all = service.list();
    expect(all.map((attempt) => attempt.title)).toEqual(["Two Sum", "Valid Palindrome"]);
    expect(all[0]?.hasVideo).toBe(true);
    expect(service.list({ categoryId: twoPointers.id })).toHaveLength(1);
    expect(service.list({ problemId: validPalindromeId })[0]?.title).toBe("Valid Palindrome");
  });

  it("updates phrases by difference without accepting another attempt's phrase id", () => {
    const validPalindromeId = problemId(125);
    const first = service.create({
      ...baseInput(validPalindromeId),
      phrases: [
        { englishText: "keep", japaneseText: "維持" },
        { englishText: "delete", japaneseText: "削除" },
      ],
    });
    const other = service.create(baseInput(problemId(1)));
    const retainedId = first.phrases[0]!.id;
    const foreignId = other.phrases[0]!.id;

    const updated = service.update(first.id, {
      ...baseInput(validPalindromeId),
      phrases: [
        { id: retainedId, englishText: "kept", japaneseText: "維持した" },
        { id: foreignId, englishText: "hacked", japaneseText: "改ざん" },
        { englishText: "new", japaneseText: "新規" },
      ],
    });

    expect(updated.attemptNumber).toBe(1);
    expect(updated.phrases.map((phrase) => phrase.englishText)).toEqual(["kept", "new"]);
    expect(service.get(other.id).phrases[0]?.englishText).toBe("edge case");
  });

  it("deletes an attempt and its phrases", () => {
    const created = service.create(baseInput(problemId(125)));
    service.delete(created.id);

    expect(db.select({ value: count() }).from(attempts).get()?.value).toBe(0);
    expect(db.select({ value: count() }).from(phrases).get()?.value).toBe(0);
    expect(() => service.get(created.id)).toThrowError(ApiError);
  });

  it("rejects references to missing master data", () => {
    expect(() => service.create(baseInput(999_999))).toThrowError("Problem does not exist");
  });
});
