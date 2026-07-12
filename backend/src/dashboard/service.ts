import { asc, eq, isNotNull } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import { attempts, categories, problems } from "../db/schema";

type Db = BetterSQLite3Database<typeof schema>;
export type Granularity = "weekly" | "monthly";

function isoWeek(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

export class DashboardService {
  constructor(private readonly db: Db) {}

  coverage() {
    const categoryRows = this.db.select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder))
      .all();
    const problemRows = this.db.select({ id: problems.id, categoryId: problems.categoryId }).from(problems).all();
    const attemptRows = this.db.select({ problemId: attempts.problemId })
      .from(attempts)
      .where(isNotNull(attempts.problemId))
      .all();

    const problemCategory = new Map(problemRows.map((problem) => [problem.id, problem.categoryId]));
    return categoryRows.map((category) => {
      const masterIds = new Set(problemRows.filter((problem) => problem.categoryId === category.id).map((problem) => problem.id));
      const solvedIds = new Set<number>();
      let totalAttempts = 0;
      for (const attempt of attemptRows) {
        if (attempt.problemId !== null && problemCategory.get(attempt.problemId) === category.id) {
          totalAttempts += 1;
          if (masterIds.has(attempt.problemId)) solvedIds.add(attempt.problemId);
        }
      }
      const masterTotal = masterIds.size;
      return {
        categoryId: category.id,
        categoryName: category.name,
        masterTotal,
        uniqueSolved: solvedIds.size,
        coverageRate: masterTotal === 0 ? 0 : solvedIds.size / masterTotal,
        totalAttempts,
      };
    });
  }

  trend(granularity: Granularity) {
    const rows = this.db.select({ date: attempts.date }).from(attempts).orderBy(asc(attempts.date)).all();
    const counts = new Map<string, number>();
    for (const row of rows) {
      const period = granularity === "monthly" ? row.date.slice(0, 7) : isoWeek(row.date);
      counts.set(period, (counts.get(period) ?? 0) + 1);
    }
    return {
      granularity,
      points: [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
        .map(([period, attemptCount]) => ({ period, attemptCount })),
    };
  }
}
