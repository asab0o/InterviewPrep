import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { attempts, phrases, problems, quizLogs } from "../db/schema";
import { seedDatabase } from "../db/seed-service";
import { QuizService } from "./service";

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let service: QuizService;

beforeEach(() => {
  sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  seedDatabase(db);
  service = new QuizService(db);
});

afterEach(() => sqlite.close());

function insertPhrases(count: number): number[] {
  const problemId = db.select({ id: problems.id }).from(problems).limit(1).get()?.id;
  if (problemId === undefined) throw new Error("Seed problem missing");
  const attemptId = db.insert(attempts).values({
    date: "2026-07-01",
    problemId,
    attemptNumber: 1,
  }).returning({ id: attempts.id }).get().id;

  const ids: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = db.insert(phrases).values({
      attemptId,
      englishText: `phrase ${i} english`,
      japaneseText: `フレーズ${i}`,
    }).returning({ id: phrases.id }).get().id;
    ids.push(id);
  }
  return ids;
}

const JST_NOW = new Date("2026-07-19T03:00:00Z"); // JST 2026-07-19 12:00

describe("QuizService.today", () => {
  it("draws up to 3 random cards from all phrases and records a quiz log on first access", () => {
    const phraseIds = insertPhrases(5);

    const result = service.today(JST_NOW);

    expect(result.alreadyShownToday).toBe(false);
    expect(result.cards).toHaveLength(3);

    const cardPhraseIds = result.cards.map((card) => card.phraseId);
    expect(new Set(cardPhraseIds).size).toBe(3); // 重複なし
    for (const id of cardPhraseIds) expect(phraseIds).toContain(id);

    const logs = db.select().from(quizLogs).all();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.shownDate).toBe("2026-07-19");
    expect(logs[0]?.phraseIds).toEqual(cardPhraseIds);
  });

  it("returns alreadyShownToday=true with empty cards on a second access the same JST day", () => {
    insertPhrases(5);
    const first = service.today(JST_NOW);
    expect(first.alreadyShownToday).toBe(false);

    // フレーズを追加しても、抽選は走らず結果は変わらない。
    insertPhrases(5);
    const second = service.today(JST_NOW);

    expect(second).toEqual({ alreadyShownToday: true, cards: [] });
    expect(db.select().from(quizLogs).all()).toHaveLength(1);
  });

  it("returns fewer than 3 cards when fewer than 3 phrases exist", () => {
    const phraseIds = insertPhrases(2);

    const result = service.today(JST_NOW);

    expect(result.alreadyShownToday).toBe(false);
    expect(result.cards).toHaveLength(2);
    expect(result.cards.map((card) => card.phraseId).sort()).toEqual([...phraseIds].sort());
  });

  it("returns an empty cards array and still records a quiz log when there are no phrases (stock 0)", () => {
    const result = service.today(JST_NOW);

    expect(result).toEqual({ alreadyShownToday: false, cards: [] });

    // 実装判断：ストック0でもINSERTし「本日は出題済み（0件）」扱いにする。
    // これにより同日中に何度開いても再抽選が走らない一貫性を保つ。
    const logs = db.select().from(quizLogs).all();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.phraseIds).toEqual([]);

    const second = service.today(JST_NOW);
    expect(second).toEqual({ alreadyShownToday: true, cards: [] });
  });

  it("treats different JST calendar days as separate quizzes", () => {
    insertPhrases(5);
    const day1 = service.today(new Date("2026-07-18T15:30:00Z")); // JST 2026-07-19 00:30
    const day2 = service.today(new Date("2026-07-19T15:30:00Z")); // JST 2026-07-20 00:30

    expect(day1.alreadyShownToday).toBe(false);
    expect(day2.alreadyShownToday).toBe(false);
    expect(db.select().from(quizLogs).all()).toHaveLength(2);
  });

  it("absorbs a UNIQUE constraint race (another request inserts between the check and this INSERT) without throwing or double-drawing", () => {
    insertPhrases(5);

    // hasLogForDate のチェック直後に別リクエストが先にINSERTを完了させたレースを再現するため、
    // インスタンスの private チェックメソッドを一時的に「未出題」を返すよう差し替える。
    (service as unknown as { hasLogForDate: () => boolean }).hasLogForDate = () => false;

    db.insert(quizLogs).values({ shownDate: "2026-07-19", phraseIds: [999] }).run();

    const result = service.today(JST_NOW);

    // チェックは「未出題」だったが、INSERT時にUNIQUE違反が発生し既存ログを尊重してalreadyShownToday:trueを返す。
    expect(result).toEqual({ alreadyShownToday: true, cards: [] });
    // 二重INSERTされていないこと（既存の1件のみ）。
    const logs = db.select().from(quizLogs).all();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.phraseIds).toEqual([999]);
  });
});
