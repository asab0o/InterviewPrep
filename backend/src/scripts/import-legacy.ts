// 過去データの一括インポートCLIスクリプト（5.7・開発時一回限り）。
// 実行: pnpm run import:legacy -- [--dry-run] [--source=github|local] [--path=<ローカルclone先>]
//
// 引数パース・ファイル走査（GitHub API or fs）・コミット日時解決・DB書き込みのみをここで行う。
// 「フォルダ→カテゴリー解決」「ファイル名解析」「マスタ照合」「attemptNumber採番」「冪等性判定」は
// すべてテスト可能な純粋関数（src/import/parse-filename.ts, src/import/plan.ts）に委譲する。
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { loadGithubConfig } from "../config";
import { attempts, categories, problems } from "../db/schema";
import { db, sqlite } from "../db/client";
import { createFetchGithubClient, type GithubClient } from "../github/client";
import { parseArgs } from "../import/args";
import { toDateOnly, todayDateOnly } from "../import/dates";
import {
  buildAttemptDedupeKey,
  buildImportPlan,
  type ImportPlan,
  type LegacyFileEntry,
  type MasterCategoryLookup,
  type MasterProblemLookup,
  type PlannedAttempt,
} from "../import/plan";

const PROBLEMS_DIR = "problems";

async function scanGithub(client: GithubClient): Promise<LegacyFileEntry[]> {
  const folders = await client.listDirectory(PROBLEMS_DIR);
  if (!folders) {
    throw new Error(`"${PROBLEMS_DIR}/" not found in repository`);
  }

  const entries: LegacyFileEntry[] = [];
  for (const folder of folders) {
    if (folder.type !== "dir") continue;
    const dirPath = `${PROBLEMS_DIR}/${folder.name}`;

    // getLastCommitDateと同じ方針：1フォルダの一時的な失敗（レート制限・5xx等）で
    // スキャン全体を落とさず、そのフォルダだけスキップして残りの走査を継続する。
    let files: Awaited<ReturnType<GithubClient["listDirectory"]>>;
    try {
      files = await client.listDirectory(dirPath);
    } catch (error) {
      console.warn(
        `[import-legacy] could not list directory "${dirPath}", skipping this folder: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    if (!files) continue;

    for (const file of files) {
      if (file.type !== "file" || !file.name.toLowerCase().endsWith(".md")) continue;
      const filePath = `${dirPath}/${file.name}`;

      let commitDate: string | null;
      try {
        commitDate = await client.getLastCommitDate(filePath);
      } catch {
        commitDate = null;
      }
      const date = toDateOnly(commitDate);
      if (!date) {
        console.warn(`[import-legacy] could not resolve commit date for "${filePath}", falling back to today's date`);
      }
      entries.push({ folderSlug: folder.name, filename: file.name, date: date ?? todayDateOnly() });
    }
  }
  return entries;
}

// `--path` の値そのものの存在チェック（ディレクトリかどうか等）は行わない。開発者がローカルで
// 手動実行する一回限りのCLIであり、不正な値を渡した場合は readdirSync が ENOENT 等をそのまま
// 投げて main() の catch でエラーメッセージとして表示される（対応不要と判断）。
function scanLocal(rootPath: string): LegacyFileEntry[] {
  const problemsDir = join(rootPath, PROBLEMS_DIR);
  const folders = readdirSync(problemsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());

  const entries: LegacyFileEntry[] = [];
  for (const folder of folders) {
    const dirPath = join(problemsDir, folder.name);
    const files = readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"));

    for (const file of files) {
      const filePath = join(dirPath, file.name);
      const date = resolveLocalCommitDate(filePath, rootPath);
      if (!date) {
        console.warn(`[import-legacy] could not resolve commit date for "${filePath}", falling back to today's date`);
      }
      entries.push({ folderSlug: folder.name, filename: file.name, date: date ?? todayDateOnly() });
    }
  }
  return entries;
}

// `git log`で最終コミット日時を取得し、失敗した場合（git未インストール／リポジトリ外／未追跡ファイル等）は
// ファイルのmtimeにフォールバックする。両方失敗したらnull（呼び出し側で今日の日付にフォールバック）。
function resolveLocalCommitDate(filePath: string, repoRoot: string): string | null {
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%cI", "--", filePath], {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();
    const date = toDateOnly(output);
    if (date) return date;
  } catch {
    // フォールバックへ。
  }

  try {
    return toDateOnly(statSync(filePath).mtime.toISOString());
  } catch {
    return null;
  }
}

function loadMasterData(): { categoryRows: MasterCategoryLookup[]; problemRows: MasterProblemLookup[] } {
  const categoryRows = db.select({ id: categories.id, slug: categories.slug }).from(categories).all();
  const problemRows = db.select({
    id: problems.id,
    categoryId: problems.categoryId,
    number: problems.number,
    title: problems.title,
  }).from(problems).all();
  return { categoryRows, problemRows };
}

// 既存Attemptすべてを冪等キー（Q10）へ変換した集合を作る。マスタ紐付き行は
// AttemptService.list/getと同じ考え方でproblems.categoryIdを実効カテゴリーとして使う
// （attempts.categoryId列はマスタ紐付き時はNULLで保存されるため）。
function loadExistingAttemptKeys(): Set<string> {
  const resolvedCategoryId = sql<number | null>`coalesce(${problems.categoryId}, ${attempts.categoryId})`;
  const resolvedNumber = sql<number | null>`coalesce(${problems.number}, ${attempts.customNumber})`;

  const rows = db.select({
    categoryId: resolvedCategoryId,
    problemId: attempts.problemId,
    number: resolvedNumber,
    customTitle: attempts.customTitle,
    attemptNumber: attempts.attemptNumber,
  }).from(attempts)
    .leftJoin(problems, eq(attempts.problemId, problems.id))
    .all();

  const keys = new Set<string>();
  for (const row of rows) {
    if (row.categoryId === null) continue;
    if (row.problemId !== null) {
      if (row.number === null) continue;
      keys.add(buildAttemptDedupeKey({
        isMaster: true,
        categoryId: row.categoryId,
        number: row.number,
        attemptNumber: row.attemptNumber,
      }));
    } else {
      if (!row.customTitle) continue;
      keys.add(buildAttemptDedupeKey({
        isMaster: false,
        categoryId: row.categoryId,
        customTitle: row.customTitle,
        attemptNumber: row.attemptNumber,
      }));
    }
  }
  return keys;
}

function insertPlannedAttempts(planned: PlannedAttempt[]): void {
  db.transaction((tx) => {
    for (const item of planned) {
      tx.insert(attempts).values({
        date: item.date,
        problemId: item.problemId,
        customTitle: item.isMaster ? null : item.customTitle,
        customNumber: item.isMaster ? null : item.customNumber,
        categoryId: item.isMaster ? null : item.categoryId,
        attemptNumber: item.attemptNumber,
      }).run();
    }
  });
}

function printDryRunDetail(plan: ImportPlan): void {
  console.log(`\n[import-legacy] --dry-run: ${plan.toInsert.length} attempt(s) would be created:\n`);
  for (const item of plan.toInsert) {
    const origin = item.isMaster ? "master" : "custom";
    console.log(
      `  ${item.date}  [${item.categorySlug}]  #${item.number} ${item.title}` +
      `  attempt=${item.attemptNumber}  (${origin})  <- ${item.sourceFile}`,
    );
  }
}

function printSummary(scannedCount: number, plan: ImportPlan, dryRun: boolean): void {
  const counts: Record<string, number> = { unknown_category: 0, unparseable_filename: 0, duplicate: 0 };
  for (const skip of plan.skipped) counts[skip.reason] = (counts[skip.reason] ?? 0) + 1;

  console.log("\n[import-legacy] Summary");
  console.log(`  scanned files: ${scannedCount}`);
  console.log(`  ${dryRun ? "would import" : "imported"}: ${plan.toInsert.length}`);
  console.log(`  skipped (duplicate): ${counts.duplicate}`);
  console.log(`  skipped (unknown category): ${counts.unknown_category}`);
  console.log(`  skipped (unparseable name): ${counts.unparseable_filename}`);
  if (plan.warnings.length > 0) {
    console.log(`  warnings (category mismatch, still imported): ${plan.warnings.length}`);
  }

  const skipWarnings = plan.skipped.filter((skip) => skip.reason !== "duplicate");
  if (skipWarnings.length > 0) {
    console.log("\n[import-legacy] Warnings (skipped, processing continued):");
    for (const warning of skipWarnings) {
      console.log(`  - ${warning.sourceFile}: ${warning.detail}`);
    }
  }

  if (plan.warnings.length > 0) {
    console.log("\n[import-legacy] Warnings (not skipped, please double-check):");
    for (const warning of plan.warnings) {
      console.log(`  - ${warning.sourceFile}: ${warning.detail}`);
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  let files: LegacyFileEntry[];
  if (args.source === "github") {
    const githubConfig = loadGithubConfig();
    if (!githubConfig) {
      throw new Error("GITHUB_REPO_OWNER / GITHUB_REPO_NAME / GITHUB_PUSH_TOKEN must be set for --source=github");
    }
    const client = createFetchGithubClient(githubConfig);
    files = await scanGithub(client);
  } else {
    files = scanLocal(args.path!);
  }

  const { categoryRows, problemRows } = loadMasterData();
  const existingKeys = loadExistingAttemptKeys();
  const plan = buildImportPlan(files, categoryRows, problemRows, existingKeys);

  if (args.dryRun) {
    printDryRunDetail(plan);
  } else if (plan.toInsert.length > 0) {
    insertPlannedAttempts(plan.toInsert);
  }

  printSummary(files.length, plan, args.dryRun);
}

main()
  .catch((error: unknown) => {
    console.error(`[import-legacy] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => {
    sqlite.close();
  });
