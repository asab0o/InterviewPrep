import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { ApiError } from "../errors";
import * as schema from "../db/schema";
import { attempts, categories, phrases, problems } from "../db/schema";
import type { AttemptInput } from "./validation";

type Db = BetterSQLite3Database<typeof schema>;
type Filters = { categoryId?: number; problemId?: number };

const resolvedCategoryId = sql<number>`coalesce(${problems.categoryId}, ${attempts.categoryId})`;

function nullable(value: string | null | undefined): string | null {
  return value ?? null;
}

function toIso(value: Date): string {
  return value.toISOString();
}

export class AttemptService {
  constructor(private readonly db: Db) {}

  list(filters: Filters = {}) {
    const conditions = [
      filters.categoryId === undefined ? undefined : eq(resolvedCategoryId, filters.categoryId),
      filters.problemId === undefined ? undefined : eq(attempts.problemId, filters.problemId),
    ].filter((condition) => condition !== undefined);

    return this.db.select({
      id: attempts.id,
      date: attempts.date,
      attemptNumber: attempts.attemptNumber,
      title: sql<string>`coalesce(${problems.title}, ${attempts.customTitle})`,
      number: sql<number | null>`coalesce(${problems.number}, ${attempts.customNumber})`,
      categoryName: categories.name,
      videoUrl: attempts.videoUrl,
      githubPushed: attempts.githubPushed,
    }).from(attempts)
      .leftJoin(problems, eq(attempts.problemId, problems.id))
      .leftJoin(categories, eq(categories.id, resolvedCategoryId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(attempts.date), desc(attempts.id))
      .all()
      .map(({ videoUrl, ...row }) => ({ ...row, hasVideo: Boolean(videoUrl) }));
  }

  get(id: number) {
    const row = this.db.select({
      id: attempts.id,
      date: attempts.date,
      attemptNumber: attempts.attemptNumber,
      problemId: attempts.problemId,
      customTitle: attempts.customTitle,
      customNumber: attempts.customNumber,
      categoryId: resolvedCategoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      title: sql<string>`coalesce(${problems.title}, ${attempts.customTitle})`,
      number: sql<number | null>`coalesce(${problems.number}, ${attempts.customNumber})`,
      code: attempts.code,
      problemStatement: attempts.problemStatement,
      umpireExplanation: sql<string | null>`coalesce(${problems.umpireExplanation}, ${attempts.umpireExplanation})`,
      videoUrl: attempts.videoUrl,
      transcript: attempts.transcript,
      retrospective: attempts.retrospective,
      githubPushed: attempts.githubPushed,
      githubPath: attempts.githubPath,
      createdAt: attempts.createdAt,
      updatedAt: attempts.updatedAt,
    }).from(attempts)
      .leftJoin(problems, eq(attempts.problemId, problems.id))
      .leftJoin(categories, eq(categories.id, resolvedCategoryId))
      .where(eq(attempts.id, id)).get();

    if (!row) throw new ApiError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
    const phraseRows = this.db.select({
      id: phrases.id,
      englishText: phrases.englishText,
      japaneseText: phrases.japaneseText,
    }).from(phrases).where(eq(phrases.attemptId, id)).orderBy(phrases.id).all();

    return { ...row, createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt), phrases: phraseRows };
  }

  create(input: AttemptInput) {
    return this.db.transaction((tx) => {
      this.assertReferences(tx, input);
      const attemptNumber = this.nextAttemptNumber(tx, input);
      const created = tx.insert(attempts).values({
        date: input.date,
        problemId: input.problemId,
        customTitle: input.problemId === null ? input.customTitle : null,
        customNumber: input.problemId === null ? input.customNumber : null,
        categoryId: input.problemId === null ? input.categoryId : null,
        attemptNumber,
        code: nullable(input.code),
        problemStatement: nullable(input.problemStatement),
        umpireExplanation: input.problemId === null ? nullable(input.umpireExplanation) : null,
        videoUrl: nullable(input.videoUrl),
        transcript: nullable(input.transcript),
        retrospective: nullable(input.retrospective),
      }).returning({ id: attempts.id }).get();

      if (input.phrases.length) {
        tx.insert(phrases).values(input.phrases.map((phrase) => ({
          attemptId: created.id,
          englishText: phrase.englishText,
          japaneseText: phrase.japaneseText,
        }))).run();
      }
      return this.get(created.id);
    });
  }

  update(id: number, input: AttemptInput) {
    return this.db.transaction((tx) => {
      const current = tx.select({ id: attempts.id }).from(attempts).where(eq(attempts.id, id)).get();
      if (!current) throw new ApiError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
      this.assertReferences(tx, input);

      tx.update(attempts).set({
        date: input.date,
        problemId: input.problemId,
        customTitle: input.problemId === null ? input.customTitle : null,
        customNumber: input.problemId === null ? input.customNumber : null,
        categoryId: input.problemId === null ? input.categoryId : null,
        code: nullable(input.code),
        problemStatement: nullable(input.problemStatement),
        umpireExplanation: input.problemId === null ? nullable(input.umpireExplanation) : null,
        videoUrl: nullable(input.videoUrl),
        transcript: nullable(input.transcript),
        retrospective: nullable(input.retrospective),
        updatedAt: new Date(),
      }).where(eq(attempts.id, id)).run();

      const retainedIds = input.phrases.flatMap((phrase) => phrase.id === undefined ? [] : [phrase.id]);
      const existing = tx.select({ id: phrases.id }).from(phrases).where(eq(phrases.attemptId, id)).all();
      const deleteIds = existing.map((phrase) => phrase.id).filter((phraseId) => !retainedIds.includes(phraseId));
      if (deleteIds.length) tx.delete(phrases).where(inArray(phrases.id, deleteIds)).run();

      for (const phrase of input.phrases) {
        if (phrase.id === undefined) {
          tx.insert(phrases).values({ attemptId: id, englishText: phrase.englishText, japaneseText: phrase.japaneseText }).run();
        } else {
          tx.update(phrases).set({ englishText: phrase.englishText, japaneseText: phrase.japaneseText })
            .where(and(eq(phrases.id, phrase.id), eq(phrases.attemptId, id))).run();
        }
      }
      return this.get(id);
    });
  }

  delete(id: number): void {
    const result = this.db.delete(attempts).where(eq(attempts.id, id)).run();
    if (result.changes === 0) throw new ApiError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");
  }

  private assertReferences(db: Db, input: AttemptInput): void {
    if (input.problemId !== null) {
      const problem = db.select({ id: problems.id }).from(problems).where(eq(problems.id, input.problemId)).get();
      if (!problem) throw new ApiError(400, "INVALID_PROBLEM", "Problem does not exist");
    }
    if (input.problemId === null && input.categoryId != null) {
      const category = db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId)).get();
      if (!category) throw new ApiError(400, "INVALID_CATEGORY", "Category does not exist");
    }
  }

  private nextAttemptNumber(db: Db, input: AttemptInput): number {
    const condition = input.problemId !== null
      ? eq(attempts.problemId, input.problemId)
      : and(sql`${attempts.problemId} is null`, eq(attempts.customTitle, input.customTitle!));
    const result = db.select({ value: count() }).from(attempts).where(condition).get();
    return (result?.value ?? 0) + 1;
  }
}
