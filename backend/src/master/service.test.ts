import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { categories, problems } from "../db/schema";
import { seedDatabase } from "../db/seed-service";
import { ApiError } from "../errors";
import { MasterService } from "./service";

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let service: MasterService;

beforeEach(() => {
  sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  seedDatabase(db);
  service = new MasterService(db);
});

afterEach(() => sqlite.close());

describe("MasterService", () => {
  it("returns active categories in sort order", () => {
    db.update(categories).set({ isActive: false }).where(eq(categories.slug, "sliding-window")).run();

    const rows = service.listCategories();
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({ id: expect.any(Number), name: "Arrays and Hashing", slug: "array-hashmap", sortOrder: 1 });
    expect(rows.some((category) => category.slug === "sliding-window")).toBe(false);
  });

  it("returns lightweight problem rows without explanation text", () => {
    const validPalindrome = db.select().from(problems).where(eq(problems.number, 125)).get();
    if (!validPalindrome) throw new Error("Seed problem missing");
    db.update(problems).set({ umpireExplanation: "Generated explanation", umpireGeneratedAt: new Date("2026-07-12T00:00:00Z") })
      .where(eq(problems.id, validPalindrome.id)).run();

    const row = service.listProblems().find((problem) => problem.id === validPalindrome.id);
    expect(service.listProblems()).toHaveLength(59);
    expect(row).toEqual({
      id: validPalindrome.id,
      categoryId: validPalindrome.categoryId,
      number: 125,
      title: "Valid Palindrome",
      slug: "valid-palindrome",
      hasUmpireExplanation: true,
    });
    expect(row).not.toHaveProperty("umpireExplanation");
  });

  it("filters problems by category", () => {
    const twoPointers = db.select().from(categories).where(eq(categories.slug, "two-pointers")).get();
    if (!twoPointers) throw new Error("Seed category missing");

    const rows = service.listProblems(twoPointers.id);
    expect(rows).toHaveLength(5);
    expect(rows.every((problem) => problem.categoryId === twoPointers.id)).toBe(true);
  });

  it("returns explanation and ISO generation time in problem details", () => {
    const validPalindrome = db.select().from(problems).where(eq(problems.number, 125)).get();
    if (!validPalindrome) throw new Error("Seed problem missing");
    db.update(problems).set({ umpireExplanation: "Generated explanation", umpireGeneratedAt: new Date("2026-07-12T03:04:05Z") })
      .where(eq(problems.id, validPalindrome.id)).run();

    expect(service.getProblem(validPalindrome.id)).toEqual(expect.objectContaining({
      hasUmpireExplanation: true,
      umpireExplanation: "Generated explanation",
      umpireGeneratedAt: "2026-07-12T03:04:05.000Z",
    }));
  });

  it("returns 404 for an unknown problem", () => {
    expect(() => service.getProblem(999_999)).toThrowError(ApiError);
    try {
      service.getProblem(999_999);
    } catch (error) {
      expect(error).toMatchObject({ status: 404, code: "PROBLEM_NOT_FOUND" });
    }
  });
});
