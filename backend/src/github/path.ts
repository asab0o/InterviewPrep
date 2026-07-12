// GitHub push先パス（5.4）の算出に関する純粋関数群。DBアクセス・API呼び出しを含まない。

// kebab-caseスラッグ生成（マスタ外問題のcustomTitleから使用）。
// 小文字化 → 英数字以外の連続をハイフンに圧縮 → 前後のハイフンを除去。
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type GithubPathInput = {
  categorySlug: string;
  number: number;
  slug: string;
  attemptNumber: number;
};

// problems/{category.slug}/{number}-{slug}.md（attemptNumber>=2は末尾に -{attemptNumber}）
export function buildGithubPath({ categorySlug, number, slug, attemptNumber }: GithubPathInput): string {
  const suffix = attemptNumber > 1 ? `-${attemptNumber}` : "";
  return `problems/${categorySlug}/${number}-${slug}${suffix}.md`;
}
