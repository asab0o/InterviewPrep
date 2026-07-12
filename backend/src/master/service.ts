import { asc, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import { categories, problems } from "../db/schema";
import { ApiError } from "../errors";

type Db = BetterSQLite3Database<typeof schema>;

export class MasterService {
  constructor(private readonly db: Db) {}

  listCategories() {
    return this.db.select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      sortOrder: categories.sortOrder,
    }).from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.id))
      .all();
  }

  listProblems(categoryId?: number) {
    return this.db.select({
      id: problems.id,
      categoryId: problems.categoryId,
      number: problems.number,
      title: problems.title,
      slug: problems.slug,
      umpireExplanation: problems.umpireExplanation,
    }).from(problems)
      .innerJoin(categories, eq(problems.categoryId, categories.id))
      .where(categoryId === undefined ? undefined : eq(problems.categoryId, categoryId))
      .orderBy(asc(categories.sortOrder), asc(problems.id))
      .all()
      .map(({ umpireExplanation, ...problem }) => ({
        ...problem,
        hasUmpireExplanation: umpireExplanation !== null,
      }));
  }

  getProblem(id: number) {
    const problem = this.db.select({
      id: problems.id,
      categoryId: problems.categoryId,
      number: problems.number,
      title: problems.title,
      slug: problems.slug,
      umpireExplanation: problems.umpireExplanation,
      umpireGeneratedAt: problems.umpireGeneratedAt,
    }).from(problems).where(eq(problems.id, id)).get();

    if (!problem) throw new ApiError(404, "PROBLEM_NOT_FOUND", "Problem not found");
    return {
      ...problem,
      hasUmpireExplanation: problem.umpireExplanation !== null,
      umpireGeneratedAt: problem.umpireGeneratedAt?.toISOString() ?? null,
    };
  }
}
