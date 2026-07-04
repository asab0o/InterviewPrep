# DB スキーマ設計（要件定義 v1.0 / 7章・8章対応）

## ORM の選定：Drizzle ORM を採用

| 観点 | Drizzle（採用） | Prisma（不採用） |
|---|---|---|
| ランタイム重量 | 軽量。クエリエンジンのネイティブバイナリ不要（純TS） | Rust製クエリエンジンのバイナリを同梱。メモリ・ディスクを消費 |
| Lightsail 小型インスタンス適性 | 高い（月$5〜、メモリ512MB〜1GB想定に収まりやすい） | エンジンプロセス分のオーバーヘッドがある |
| SQLite → PostgreSQL 移行 | `drizzle-orm/better-sqlite3` と `drizzle-orm/node-postgres` でdialectを差し替え。スキーマ定義（TS）はほぼ共通化でき、8章「将来RDS移行」の方針と整合 | マイグレーションは容易だが、方言差はProvider切替で吸収 |
| マイグレーション | `drizzle-kit generate` で生SQLマイグレーションを出力。SQLiteの実DDLをレビューできる | マイグレーションはPrisma管理下でブラックボックス化しやすい |
| 型安全 | TypeScript ファーストでスキーマ＝型 | 別途生成された Client 型 |

**採用理由の要約**：8章の「Lightsail 小型インスタンスに Express + SQLite を同居、クレジット枯渇後も低コスト維持」「将来 PostgreSQL 移行」という2要件に対して、ランタイムが軽く dialect 差し替えで移行できる Drizzle が最適。7章「配列は JSON 文字列で TEXT 保存」という方針も、Drizzle の `text({ mode: 'json' })` でそのまま表現できる。

> 補足：SQLite ドライバは同期APIで速い `better-sqlite3` を第一候補とする（単一ユーザー・低トラフィックのため同期でも問題なし）。

---

## スキーマ定義（`src/db/schema.ts`）

```ts
import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Category（マスタ。初期7件。行追加のみで拡張可能 = 5.2）
// ---------------------------------------------------------------------------
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),                       // 例: "Two Pointers"
  slug: text('slug').notNull(),                       // GitHubフォルダ名 例: "two-pointers"（5.4）
  sortOrder: integer('sort_order').notNull(),         // プルダウン/ダッシュボード表示順
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
}, (t) => ({
  slugUq: uniqueIndex('ux_categories_slug').on(t.slug),
}));

// ---------------------------------------------------------------------------
// Problem（NeetCode 150 問題マスタ。初期7カテゴリー59問 = 5.1 / 付録A）
// ---------------------------------------------------------------------------
export const problems = sqliteTable('problems', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  number: integer('number').notNull(),                // LeetCode番号 例: 125
  title: text('title').notNull(),                     // 例: "Valid Palindrome"
  slug: text('slug').notNull(),                       // ファイル名用 例: "valid-palindrome"

  // UMPIRE解説：1問1件でキャッシュ。再生成時のみ上書き（5.5）
  umpireExplanation: text('umpire_explanation'),      // NULL = 未生成
  // 生成日時（キャッシュ管理・再生成ボタン判定の補助。要件外の合理的追加。open-questions Q4参照）
  umpireGeneratedAt: integer('umpire_generated_at', { mode: 'timestamp' }),
}, (t) => ({
  categoryIdx: index('ix_problems_category').on(t.categoryId),
  numberUq: uniqueIndex('ux_problems_number').on(t.number),
}));

// ---------------------------------------------------------------------------
// Attempt（記録の基本単位 = 5.3 / 5.8）
// ---------------------------------------------------------------------------
export const attempts = sqliteTable('attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // 記録日（ユーザー入力。日付のみ 'YYYY-MM-DD'。UTC/JSTのタイムゾーン混乱を避けるため文字列保持）
  date: text('date').notNull(),

  // マスタ問題への参照。マスタ外の場合は NULL（7章）
  problemId: integer('problem_id').references(() => problems.id),
  // マスタ外問題の自由入力タイトル/番号（任意）
  customTitle: text('custom_title'),
  customNumber: integer('custom_number'),             // GitHubファイル名生成に使用
  // マスタ外問題のカテゴリー直接保持（任意）。マスタ問題は problemId 経由で取得
  categoryId: integer('category_id').references(() => categories.id),

  // 同一問題の何回目か。保存時に自動採番（手入力させない）= 7章
  attemptNumber: integer('attempt_number').notNull(),

  code: text('code'),                                 // プレーンテキスト
  problemStatement: text('problem_statement'),        // UMPIRE生成用に貼った問題文（任意）

  // マスタ外問題のUMPIRE解説はAttempt側に持つ（マスタ問題はProblem側 = 7章）
  umpireExplanation: text('umpire_explanation'),

  videoUrl: text('video_url'),                        // YouTube URL（任意。後から編集で貼付 = 5.8）
  transcript: text('transcript'),                     // 文字起こし全文（任意 = 5.3）
  // できなかったこと・つまずいた点の自由記述。旧UMPIREのU/M/P記述欄の簡略版（任意 = 5.3、push本文フォーマット = 5.4 Q16）
  retrospective: text('retrospective'),

  githubPushed: integer('github_pushed', { mode: 'boolean' }).notNull().default(false),
  // 実際にpushしたリポジトリ内パス。上書き防止チェック・再push時の同一パス判定に使用
  // （要件5.4の上書き防止を確実にするための合理的追加。open-questions Q5参照）
  githubPath: text('github_path'),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (t) => ({
  dateIdx: index('ix_attempts_date').on(t.date),
  problemIdx: index('ix_attempts_problem').on(t.problemId),
  categoryIdx: index('ix_attempts_category').on(t.categoryId),
}));

// ---------------------------------------------------------------------------
// Phrase（覚えたい英語フレーズ。独立テーブル。フラッシュカードで横断参照 = 5.3 / 5.6）
// ---------------------------------------------------------------------------
export const phrases = sqliteTable('phrases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  attemptId: integer('attempt_id')
    .notNull()
    .references(() => attempts.id, { onDelete: 'cascade' }),
  englishText: text('english_text').notNull(),
  japaneseText: text('japanese_text').notNull(),      // Haikuサジェスト or 手動（5.3）
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (t) => ({
  attemptIdx: index('ix_phrases_attempt').on(t.attemptId),
}));

// ---------------------------------------------------------------------------
// QuizLog（フラッシュカード出題履歴。JST基準の1日1回判定 = 5.6）
// ---------------------------------------------------------------------------
export const quizLogs = sqliteTable('quiz_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // 出題日（JST基準の 'YYYY-MM-DD'）。この値が「JSTの今日」と一致すれば本日出題済み
  shownDate: text('shown_date').notNull(),
  // 出題した3件のPhrase id配列。SQLiteに配列型がないためJSON文字列でTEXT保存（7章 実装注記）
  phraseIds: text('phrase_ids', { mode: 'json' }).$type<number[]>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (t) => ({
  // JST日付ごとに1レコードで「本日出題済み」を高速判定
  shownDateUq: uniqueIndex('ux_quiz_logs_shown_date').on(t.shownDate),
}));

// ---------------------------------------------------------------------------
// 型エクスポート（実装担当が利用）
// ---------------------------------------------------------------------------
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
```

## drizzle.config.ts（マイグレーション生成設定）

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',                 // 生成マイグレーション(生SQL)の出力先
  dbCredentials: {
    url: process.env.DB_PATH!,      // 12章の環境変数 DB_PATH を使用
  },
});
```

`pnpm exec drizzle-kit generate` で `drizzle/0000_xxx.sql` を生成 → 起動時 or `drizzle-kit migrate` で適用。
（パッケージマネージャはpnpm。npm/npxは使わない。`CLAUDE.md`参照）

## PostgreSQL 移行時の差分（8章「将来RDS移行」）
- `sqliteTable` → `pgTable`、`integer autoIncrement` → `serial`、`integer({mode:'timestamp'})` → `timestamp`、`text({mode:'json'})` → `jsonb`。
- テーブル構造・リレーション・カラム意味は不変。dialectアダプタとカラム型ヘルパーの差し替えのみ。

## 設計上の判断メモ（7章からの明示的追加・変更）
1. `problems.number` に UNIQUE 制約：NeetCode番号の重複投入を防ぐ（付録A整合性担保）。
2. `problems.umpireGeneratedAt`：7章にないが、5.5の「キャッシュ再利用・明示的再生成」を運用・監査しやすくするため追加（NULL許容なので既存要件を壊さない）。→ 要確認 Q4。
3. `attempts.githubPath`：5.4の上書き防止チェックを確実にするため、pushしたパスを記録する列を追加。→ 要確認 Q5。
4. `attempts.date` を TEXT('YYYY-MM-DD') で保持：日付のみの記録項目でありタイムゾーン起因のズレを避けるため。
5. `phrases` は `onDelete: 'cascade'`：Attempt削除時に紐づくフレーズも削除（フラッシュカードに孤児フレーズが残らない）。→ 要確認 Q6（削除機能の有無自体が未定義）。
6. `attempts.retrospective`：7章にない列を追加。旧Obsidianテンプレートの UMPIRE U/M/P（Summary/Pattern/Approach）記述欄が実際にはほとんど使われていなかったことを踏まえ、GitHub push本文（5.4）で同じ役割を「できなかったこと」の一言記述に簡略化するための列（Q16解決済み・`docs/design/05-open-questions.md`参照）。
