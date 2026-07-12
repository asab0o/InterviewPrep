import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("ux_categories_slug").on(table.slug)],
);

export const problems = sqliteTable(
  "problems",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id").notNull().references(() => categories.id),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    umpireExplanation: text("umpire_explanation"),
    umpireGeneratedAt: integer("umpire_generated_at", { mode: "timestamp" }),
  },
  (table) => [
    index("ix_problems_category").on(table.categoryId),
    uniqueIndex("ux_problems_number").on(table.number),
  ],
);

export const attempts = sqliteTable(
  "attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    problemId: integer("problem_id").references(() => problems.id),
    customTitle: text("custom_title"),
    customNumber: integer("custom_number"),
    categoryId: integer("category_id").references(() => categories.id),
    attemptNumber: integer("attempt_number").notNull(),
    code: text("code"),
    problemStatement: text("problem_statement"),
    umpireExplanation: text("umpire_explanation"),
    videoUrl: text("video_url"),
    transcript: text("transcript"),
    retrospective: text("retrospective"),
    githubPushed: integer("github_pushed", { mode: "boolean" }).notNull().default(false),
    githubPath: text("github_path"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("ix_attempts_date").on(table.date),
    index("ix_attempts_problem").on(table.problemId),
    index("ix_attempts_category").on(table.categoryId),
  ],
);

export const phrases = sqliteTable(
  "phrases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    attemptId: integer("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    englishText: text("english_text").notNull(),
    japaneseText: text("japanese_text").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index("ix_phrases_attempt").on(table.attemptId)],
);

export const quizLogs = sqliteTable(
  "quiz_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    shownDate: text("shown_date").notNull(),
    phraseIds: text("phrase_ids", { mode: "json" }).$type<number[]>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("ux_quiz_logs_shown_date").on(table.shownDate)],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;
export type Attempt = typeof attempts.$inferSelect;
export type NewAttempt = typeof attempts.$inferInsert;
export type Phrase = typeof phrases.$inferSelect;
export type NewPhrase = typeof phrases.$inferInsert;
export type QuizLog = typeof quizLogs.$inferSelect;
export type NewQuizLog = typeof quizLogs.$inferInsert;
