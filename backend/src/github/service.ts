import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import { attempts, categories, phrases, problems } from "../db/schema";
import { ApiError } from "../errors";
import type { GithubClient } from "./client";
import { buildMarkdown } from "./markdown";
import { buildGithubPath, slugify } from "./path";

type Db = BetterSQLite3Database<typeof schema>;

export type GithubCheckResponse = { path: string; exists: boolean; createdByApp: boolean };
export type GithubPushResponse = { path: string; commitUrl: string; sha: string };

type ResolvedAttempt = {
  id: number;
  date: string;
  attemptNumber: number;
  title: string;
  number: number;
  categorySlug: string;
  slug: string;
  code: string | null;
  retrospective: string | null;
  phrases: { englishText: string; japaneseText: string }[];
};

export class GithubService {
  // client が null ＝ GITHUB_REPO_OWNER/GITHUB_REPO_NAME/GITHUB_PUSH_TOKEN のいずれか未設定
  // （サーバー自体は起動している状態）。呼び出し時に503へ変換する。
  constructor(
    private readonly client: GithubClient | null,
    private readonly db: Db,
  ) {}

  async check(attemptId: number): Promise<GithubCheckResponse> {
    const client = this.requireClient();
    const resolved = this.resolveAttempt(attemptId);
    const path = buildGithubPath(resolved);

    const existing = await this.getFile(client, path);
    return {
      path,
      exists: existing !== null,
      createdByApp: this.isCreatedByApp(path),
    };
  }

  async push(attemptId: number, content: string | undefined, force: boolean): Promise<GithubPushResponse> {
    const client = this.requireClient();
    const resolved = this.resolveAttempt(attemptId);
    const path = buildGithubPath(resolved);

    const existing = await this.getFile(client, path);
    if (existing !== null) {
      const createdByApp = this.isCreatedByApp(path);
      // 競合回避ルール（Q7）：既存(Obsidian時代等)の管理外ファイルはforceでも上書きさせない（安全側）。
      if (!createdByApp) {
        throw new ApiError(409, "FILE_NOT_APP_MANAGED", "このパスは既存の管理外ファイルのため上書きできません");
      }
      if (!force) {
        throw new ApiError(409, "FILE_EXISTS", "同一パスのファイルが既に存在します");
      }
    }

    const body = content ?? buildMarkdown(resolved);
    const message = `${existing ? "Update" : "Add"} ${path}`;

    let result;
    try {
      result = await client.putFile(path, body, message, existing?.sha);
    } catch {
      throw new ApiError(502, "GITHUB_PUSH_FAILED", "GitHubへのpushに失敗しました");
    }

    this.db.update(attempts)
      .set({ githubPushed: true, githubPath: path })
      .where(eq(attempts.id, attemptId))
      .run();

    return { path, commitUrl: result.commitUrl, sha: result.sha };
  }

  private requireClient(): GithubClient {
    if (!this.client) {
      throw new ApiError(503, "GITHUB_UNAVAILABLE", "GitHub連携が設定されていません");
    }
    return this.client;
  }

  private async getFile(client: GithubClient, path: string) {
    try {
      return await client.getFile(path);
    } catch {
      throw new ApiError(502, "GITHUB_CHECK_FAILED", "GitHub上のファイル状態確認に失敗しました");
    }
  }

  // DB上のいずれかのAttemptのgithubPathがこのpathと一致すれば、アプリが以前pushしたファイルと判定する。
  private isCreatedByApp(path: string): boolean {
    const row = this.db.select({ id: attempts.id }).from(attempts).where(eq(attempts.githubPath, path)).get();
    return row !== undefined;
  }

  private resolveAttempt(id: number): ResolvedAttempt {
    const row = this.db.select({
      id: attempts.id,
      date: attempts.date,
      attemptNumber: attempts.attemptNumber,
      problemId: attempts.problemId,
      customTitle: attempts.customTitle,
      customNumber: attempts.customNumber,
      attemptCategoryId: attempts.categoryId,
      code: attempts.code,
      retrospective: attempts.retrospective,
      problemNumber: problems.number,
      problemTitle: problems.title,
      problemSlug: problems.slug,
      problemCategoryId: problems.categoryId,
    }).from(attempts)
      .leftJoin(problems, eq(attempts.problemId, problems.id))
      .where(eq(attempts.id, id))
      .get();

    if (!row) throw new ApiError(404, "ATTEMPT_NOT_FOUND", "Attempt not found");

    // カテゴリー必須チェック（設計書02-api-design.md 7章）：マスタ問題はproblem.categoryIdから
    // 解決できるが、マスタ外問題でattempts.categoryIdがNULLの場合は解決不能。
    const categoryId = row.problemCategoryId ?? row.attemptCategoryId;
    if (categoryId === null || categoryId === undefined) {
      throw new ApiError(400, "CATEGORY_REQUIRED", "マスタ外問題はカテゴリーを設定してからpushしてください");
    }
    const category = this.db.select({ slug: categories.slug }).from(categories)
      .where(eq(categories.id, categoryId)).get();
    if (!category) {
      throw new ApiError(400, "CATEGORY_REQUIRED", "マスタ外問題はカテゴリーを設定してからpushしてください");
    }

    const isMaster = row.problemId !== null;

    // 番号必須チェック（設計に明記なし、実装判断。要件5.3のGitHubファイル名生成に番号を使う
    // 記述に沿い、customNumberがNULLの場合は安全側として400で番号入力を要求する）。
    const number = isMaster ? row.problemNumber : row.customNumber;
    if (number === null || number === undefined) {
      throw new ApiError(400, "NUMBER_REQUIRED", "マスタ外問題は問題番号を設定してからpushしてください");
    }

    // 問題名必須チェック（NUMBER_REQUIREDと対称。customTitleは登録時のバリデーションで必須だが、
    // 直接のDB操作・将来のインポート経路等をすり抜けてNULL/空文字が入るケースに備えた防御。
    // ここで弾いておかないとslugify(null)で例外となり500になってしまう）。
    if (!isMaster && !row.customTitle?.trim()) {
      throw new ApiError(400, "TITLE_REQUIRED", "マスタ外問題は問題名を設定してからpushしてください");
    }

    const title = isMaster ? row.problemTitle! : row.customTitle!;
    const slug = isMaster ? row.problemSlug! : slugify(row.customTitle!);

    const phraseRows = this.db.select({
      englishText: phrases.englishText,
      japaneseText: phrases.japaneseText,
    }).from(phrases).where(eq(phrases.attemptId, id)).orderBy(phrases.id).all();

    return {
      id: row.id,
      date: row.date,
      attemptNumber: row.attemptNumber,
      title,
      number,
      categorySlug: category.slug,
      slug,
      code: row.code,
      retrospective: row.retrospective,
      phrases: phraseRows,
    };
  }
}
