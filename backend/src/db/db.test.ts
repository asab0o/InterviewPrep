import Database from "better-sqlite3";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { attempts, categories, phrases, problems } from "./schema";
import { seedDatabase } from "./seed-service";

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeEach(() => {
  sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
});

afterEach(() => sqlite.close());

describe("database", () => {
  it("seeds 7 categories and 59 problems idempotently", () => {
    seedDatabase(db);
    seedDatabase(db);

    expect(db.select({ value: count() }).from(categories).get()?.value).toBe(7);
    expect(db.select({ value: count() }).from(problems).get()?.value).toBe(59);
    expect(db.select().from(problems).where(eq(problems.number, 125)).get()?.title).toBe("Valid Palindrome");
  });

  it("deletes phrases when their attempt is deleted", () => {
    seedDatabase(db);
    const problem = db.select().from(problems).where(eq(problems.number, 125)).get();
    if (!problem) throw new Error("seed problem missing");

    const attempt = db.insert(attempts).values({ date: "2026-07-12", problemId: problem.id, attemptNumber: 1 }).returning().get();
    db.insert(phrases).values({ attemptId: attempt.id, englishText: "edge case", japaneseText: "境界ケース" }).run();
    db.delete(attempts).where(eq(attempts.id, attempt.id)).run();

    expect(db.select({ value: count() }).from(phrases).get()?.value).toBe(0);
  });
});
