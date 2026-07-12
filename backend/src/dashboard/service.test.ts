import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { attempts, categories, problems } from "../db/schema";
import { seedDatabase } from "../db/seed-service";
import { DashboardService } from "./service";

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let service: DashboardService;

beforeEach(() => {
  sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  seedDatabase(db);
  service = new DashboardService(db);
});

afterEach(() => sqlite.close());

function problemId(number: number): number {
  const problem = db.select({ id: problems.id }).from(problems).where(eq(problems.number, number)).get();
  if (!problem) throw new Error("Seed problem missing");
  return problem.id;
}

describe("DashboardService", () => {
  it("calculates coverage and total attempts from master-linked attempts only", () => {
    const validPalindrome = problemId(125);
    const twoSumSorted = problemId(167);
    db.insert(attempts).values([
      { date: "2026-07-01", problemId: validPalindrome, attemptNumber: 1 },
      { date: "2026-07-02", problemId: validPalindrome, attemptNumber: 2 },
      { date: "2026-07-03", problemId: twoSumSorted, attemptNumber: 1 },
      { date: "2026-07-04", problemId: null, customTitle: "Custom", attemptNumber: 1 },
    ]).run();

    const rows = service.coverage();
    const twoPointers = rows.find((row) => row.categoryName === "Two Pointers");
    expect(rows).toHaveLength(7);
    expect(twoPointers).toEqual(expect.objectContaining({
      masterTotal: 5,
      uniqueSolved: 2,
      coverageRate: 0.4,
      totalAttempts: 3,
    }));
  });

  it("returns active categories in configured sort order", () => {
    db.update(categories).set({ isActive: false }).where(eq(categories.slug, "sliding-window")).run();
    const rows = service.coverage();

    expect(rows).toHaveLength(6);
    expect(rows[0]?.categoryName).toBe("Arrays and Hashing");
    expect(rows.some((row) => row.categoryName === "Sliding Window")).toBe(false);
  });

  it("groups all learning attempts by month", () => {
    db.insert(attempts).values([
      { date: "2026-06-30", problemId: problemId(125), attemptNumber: 1 },
      { date: "2026-07-01", problemId: null, customTitle: "Custom", attemptNumber: 1 },
      { date: "2026-07-20", problemId: problemId(1), attemptNumber: 1 },
    ]).run();

    expect(service.trend("monthly")).toEqual({
      granularity: "monthly",
      points: [
        { period: "2026-06", attemptCount: 1 },
        { period: "2026-07", attemptCount: 2 },
      ],
    });
  });

  it("uses ISO week-year boundaries for weekly trends", () => {
    db.insert(attempts).values([
      { date: "2025-12-29", problemId: problemId(125), attemptNumber: 1 },
      { date: "2026-01-01", problemId: problemId(1), attemptNumber: 1 },
      { date: "2026-01-05", problemId: null, customTitle: "Custom", attemptNumber: 1 },
    ]).run();

    expect(service.trend("weekly")).toEqual({
      granularity: "weekly",
      points: [
        { period: "2026-W01", attemptCount: 2 },
        { period: "2026-W02", attemptCount: 1 },
      ],
    });
  });
});
