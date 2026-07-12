import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { categories, problems } from "./schema";
import { CATEGORY_SEED, PROBLEM_SEED } from "./seed-data";

export function seedDatabase(db: BetterSQLite3Database<typeof schema>) {
  db.transaction((tx) => {
    tx.insert(categories).values([...CATEGORY_SEED]).onConflictDoNothing().run();

    const idBySlug = new Map(tx.select().from(categories).all().map((category) => [category.slug, category.id]));
    const values = PROBLEM_SEED.map((problem) => {
      const categoryId = idBySlug.get(problem.categorySlug);
      if (categoryId === undefined) {
        throw new Error(`Unknown category slug: ${problem.categorySlug}`);
      }
      return { categoryId, number: problem.number, title: problem.title, slug: problem.slug };
    });

    tx.insert(problems).values(values).onConflictDoNothing().run();
  });

  return { categories: CATEGORY_SEED.length, problems: PROBLEM_SEED.length };
}
