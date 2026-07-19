import { eq, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import { phrases, quizLogs } from "../db/schema";
import { jstToday } from "../lib/jst";

type Db = BetterSQLite3Database<typeof schema>;

export type QuizCard = { phraseId: number; englishText: string; japaneseText: string };
export type QuizTodayResponse = { alreadyShownToday: boolean; cards: QuizCard[] };

const CARDS_PER_DAY = 3;

// better-sqlite3 は UNIQUE 制約違反時に code: "SQLITE_CONSTRAINT_UNIQUE" を持つエラーを投げる。
function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: unknown }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

const ALREADY_SHOWN: QuizTodayResponse = { alreadyShownToday: true, cards: [] };

export class QuizService {
  constructor(private readonly db: Db) {}

  // GET /api/quiz/today の副作用（初回アクセス時のQuizLog記録）込みのエントリポイント。
  today(now: Date = new Date()): QuizTodayResponse {
    const shownDate = jstToday(now);

    if (this.hasLogForDate(shownDate)) return ALREADY_SHOWN;

    const cards = this.drawRandomCards();

    try {
      this.db.insert(quizLogs).values({
        shownDate,
        phraseIds: cards.map((card) => card.phraseId),
      }).run();
    } catch (error) {
      // レース対策：手順2のチェックと本INSERTの間に別リクエストが先にINSERTしていた場合、
      // UNIQUE制約違反（ux_quiz_logs_shown_date）を「既に出題済み」として吸収する。
      if (isUniqueConstraintError(error)) return ALREADY_SHOWN;
      throw error;
    }

    return { alreadyShownToday: false, cards };
  }

  private hasLogForDate(shownDate: string): boolean {
    const existing = this.db.select({ id: quizLogs.id })
      .from(quizLogs)
      .where(eq(quizLogs.shownDate, shownDate))
      .get();
    return existing !== undefined;
  }

  private drawRandomCards(): QuizCard[] {
    // ORDER BY RANDOM() は全件フルスキャン＋ソートになるが、単一ユーザー・低トラフィック前提のため許容する。
    const rows = this.db.select({
      id: phrases.id,
      englishText: phrases.englishText,
      japaneseText: phrases.japaneseText,
    })
      .from(phrases)
      .orderBy(sql`RANDOM()`)
      .limit(CARDS_PER_DAY)
      .all();

    return rows.map((row) => ({ phraseId: row.id, englishText: row.englishText, japaneseText: row.japaneseText }));
  }
}
