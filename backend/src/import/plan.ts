// 過去データインポート（5.7）の計画（走査結果 → 生成予定Attempt一覧）を組み立てる純粋関数群。
// DBアクセス・GitHub API呼び出し・fsアクセスは含まない（呼び出し側の `scripts/import-legacy.ts` が
// I/Oを担当し、この関数には走査済みのデータのみを渡す）。

import { parseLegacyFilename, titleFromSlug } from "./parse-filename";

// 走査結果1件（フォルダ・ファイル名・そのファイルの日付は呼び出し側で解決済み = YYYY-MM-DD）。
export type LegacyFileEntry = {
  folderSlug: string;
  filename: string;
  date: string;
};

export type MasterCategoryLookup = { id: number; slug: string };
export type MasterProblemLookup = { id: number; categoryId: number; number: number; title: string };

// 冪等性判定（Q10・2026-07-04決定）用の論理キー。
// マスタ紐付きAttemptは (categoryId, number, attemptNumber)、マスタ外Attemptは
// customTitleをnumberの代替として (categoryId, customTitle, attemptNumber) で判定する。
// categoryIdはマスタ紐付き時は「マスタ問題自身のcategoryId」（フォルダの解決結果ではない。
// attempts.categoryId列はマスタ紐付き時はNULLで保存されるため、既存Attempt側もproblems.categoryId
// を実効値として使う＝AttemptService.listのresolvedCategoryIdと同じ考え方）。
export type AttemptDedupeKeyInput =
  | { isMaster: true; categoryId: number; number: number; attemptNumber: number }
  | { isMaster: false; categoryId: number; customTitle: string; attemptNumber: number };

export function buildAttemptDedupeKey(input: AttemptDedupeKeyInput): string {
  return input.isMaster
    ? `master:${input.categoryId}:${input.number}:${input.attemptNumber}`
    : `custom:${input.categoryId}:${input.customTitle}:${input.attemptNumber}`;
}

export type PlannedAttempt = {
  sourceFile: string; // "{folderSlug}/{filename}"（レポート用）
  date: string;
  attemptNumber: number;
  isMaster: boolean;
  problemId: number | null;
  categoryId: number; // 実効カテゴリー（マスタ紐付き時はmaster.categoryId、マスタ外時はフォルダ由来）
  categorySlug: string;
  number: number;
  title: string;
  customTitle: string | null;
  customNumber: number | null;
};

export type SkipReason = "unknown_category" | "unparseable_filename" | "duplicate";

export type SkippedFile = {
  sourceFile: string;
  reason: SkipReason;
  detail: string;
};

// スキップはしないが確認を促すべき事項（例: フォルダとマスタ側カテゴリーの不一致）。
export type PlanWarning = {
  sourceFile: string;
  detail: string;
};

export type ImportPlan = {
  toInsert: PlannedAttempt[];
  skipped: SkippedFile[];
  warnings: PlanWarning[];
};

type Intermediate = {
  sourceFile: string;
  date: string;
  isMaster: boolean;
  problemId: number | null;
  categoryId: number;
  categorySlug: string;
  number: number;
  title: string;
  customTitle: string | null;
  customNumber: number | null;
  explicitAttemptNumber?: number;
  groupKey: string;
  order: number;
};

// 走査結果＋マスタ＋既存Attemptの論理キー集合から、生成予定Attempt一覧とスキップ理由を組み立てる。
//
// 処理順序:
// 1. 各ファイルを解析し、フォルダ→カテゴリー・番号→マスタ問題の照合を行う（失敗はskippedへ）。
//    マスタ一致時にフォルダのカテゴリーとマスタ側カテゴリーが食い違う場合はwarningsへ記録する
//    （importはスキップしない。categorySlug/categoryIdはマスタ側の値を実効値として採用する）。
// 2. マスタ紐付き問題ごと／マスタ外(categoryId+customTitle)ごとにグループ化し、attemptNumberを確定する：
//    ファイル名に明示連番（"-2"等）があればそれを採用し、無いものは同一グループ内で日付昇順
//    （同日はスキャン順）に並べ、明示連番と衝突しない最小の正整数を順に割り当てる
//    （「同一問題内の登場順で採番」の実装：ファイル一覧のスキャン順よりも日付順の方が
//    実際の挑戦順序をより正確に反映すると判断したため、日付を第一ソートキーとした）。
// 3. 冪等キー（Q10）が既存Attempt、または今回のバッチ内で先に確定した予定Attemptと重複する場合は
//    duplicateとしてスキップする。
export function buildImportPlan(
  files: LegacyFileEntry[],
  categories: MasterCategoryLookup[],
  problemsMaster: MasterProblemLookup[],
  existingKeys: ReadonlySet<string>,
): ImportPlan {
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category] as const));
  const categoryById = new Map(categories.map((category) => [category.id, category] as const));
  const problemByNumber = new Map(problemsMaster.map((problem) => [problem.number, problem] as const));

  const intermediates: Intermediate[] = [];
  const skipped: SkippedFile[] = [];
  const warnings: PlanWarning[] = [];

  files.forEach((file, order) => {
    const sourceFile = `${file.folderSlug}/${file.filename}`;
    const parseResult = parseLegacyFilename(file.filename);
    if (!parseResult.ok) {
      skipped.push({ sourceFile, reason: "unparseable_filename", detail: parseResult.reason });
      return;
    }

    const folderCategory = categoryBySlug.get(file.folderSlug);
    if (!folderCategory) {
      skipped.push({
        sourceFile,
        reason: "unknown_category",
        detail: `no category matches folder "${file.folderSlug}"`,
      });
      return;
    }

    const { parsed } = parseResult;
    const master = problemByNumber.get(parsed.number);

    if (master) {
      // categorySlugの表示・実効値は常にマスタ側（master.categoryId）から解決する
      // （DB上もmaster.categoryIdが実効カテゴリーであり、フォルダ名はあくまで走査経路に過ぎないため。
      // --dry-runの出力をDB実効値と一致させる）。フォルダとマスタのカテゴリーが食い違う場合は
      // ファイルの配置ミスの可能性があるため警告を出す（importはスキップせず継続する）。
      const canonicalCategory = categoryById.get(master.categoryId);
      if (canonicalCategory && canonicalCategory.id !== folderCategory.id) {
        warnings.push({
          sourceFile,
          detail:
            `file is under folder "${file.folderSlug}" but master problem #${master.number} ` +
            `("${master.title}") belongs to category "${canonicalCategory.slug}"`,
        });
      }

      intermediates.push({
        sourceFile,
        date: file.date,
        isMaster: true,
        problemId: master.id,
        categoryId: master.categoryId,
        categorySlug: canonicalCategory?.slug ?? folderCategory.slug,
        number: master.number,
        title: master.title,
        customTitle: null,
        customNumber: null,
        explicitAttemptNumber: parsed.attemptNumber,
        groupKey: `master:${master.id}`,
        order,
      });
      return;
    }

    const customTitle = parsed.kind === "old" ? parsed.title : titleFromSlug(parsed.slug);
    intermediates.push({
      sourceFile,
      date: file.date,
      isMaster: false,
      problemId: null,
      categoryId: folderCategory.id,
      categorySlug: folderCategory.slug,
      number: parsed.number,
      title: customTitle,
      customTitle,
      customNumber: parsed.number,
      explicitAttemptNumber: parsed.attemptNumber,
      groupKey: `custom:${folderCategory.id}:${customTitle}`,
      order,
    });
  });

  const attemptNumberByItem = resolveAttemptNumbers(intermediates);

  const toInsert: PlannedAttempt[] = [];
  const seenInBatch = new Set<string>();

  for (const item of intermediates) {
    const attemptNumber = attemptNumberByItem.get(item)!;
    const key = buildAttemptDedupeKey(
      item.isMaster
        ? { isMaster: true, categoryId: item.categoryId, number: item.number, attemptNumber }
        : { isMaster: false, categoryId: item.categoryId, customTitle: item.customTitle!, attemptNumber },
    );

    if (existingKeys.has(key) || seenInBatch.has(key)) {
      skipped.push({ sourceFile: item.sourceFile, reason: "duplicate", detail: `duplicate logical key: ${key}` });
      continue;
    }
    seenInBatch.add(key);

    toInsert.push({
      sourceFile: item.sourceFile,
      date: item.date,
      attemptNumber,
      isMaster: item.isMaster,
      problemId: item.problemId,
      categoryId: item.categoryId,
      categorySlug: item.categorySlug,
      number: item.number,
      title: item.title,
      customTitle: item.customTitle,
      customNumber: item.customNumber,
    });
  }

  return { toInsert, skipped, warnings };
}

function resolveAttemptNumbers(intermediates: Intermediate[]): Map<Intermediate, number> {
  const groups = new Map<string, Intermediate[]>();
  for (const item of intermediates) {
    const group = groups.get(item.groupKey);
    if (group) group.push(item);
    else groups.set(item.groupKey, [item]);
  }

  const result = new Map<Intermediate, number>();

  for (const group of groups.values()) {
    const used = new Set<number>();
    for (const item of group) {
      if (item.explicitAttemptNumber !== undefined) {
        used.add(item.explicitAttemptNumber);
        result.set(item, item.explicitAttemptNumber);
      }
    }

    const implicit = group
      .filter((item) => item.explicitAttemptNumber === undefined)
      .sort((a, b) => (a.date === b.date ? a.order - b.order : a.date.localeCompare(b.date)));

    let candidate = 1;
    for (const item of implicit) {
      while (used.has(candidate)) candidate += 1;
      used.add(candidate);
      result.set(item, candidate);
    }
  }

  return result;
}
