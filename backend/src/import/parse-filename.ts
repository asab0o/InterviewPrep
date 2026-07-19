// 過去データインポート（5.7）用のファイル名パーサ。GitHub API・fsアクセスを含まない純粋関数群。
// `plan.ts`（マスタ照合・冪等性判定）や `scripts/import-legacy.ts`（I/O）から呼び出される。

export type ParsedLegacyFilename =
  | { kind: "new"; number: number; slug: string; attemptNumber?: number }
  | { kind: "old"; number: number; title: string; attemptNumber?: number };

export type ParseFilenameResult =
  | { ok: true; parsed: ParsedLegacyFilename }
  | { ok: false; reason: string };

// 旧形式（Obsidian時代）: "{number}. {Title}.md"（ピリオド＋半角スペース区切り）
// 例: "21. Merge Two Sorted Lists.md"
const OLD_FORMAT = /^(\d+)\.\s+(.+)\.md$/i;

// 新形式: "{number}-{slug}.md" / 再挑戦: "{number}-{slug}-{n}.md"
// 例: "125-valid-palindrome.md" / "125-valid-palindrome-2.md"
const NEW_FORMAT = /^(\d+)-(.+)\.md$/i;

// 新形式の末尾から再挑戦連番（"-{n}"）を切り出す。
const TRAILING_ATTEMPT_NUMBER = /^(.+)-(\d+)$/;

function isValidNumber(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

// 新旧いずれかの命名規則でファイル名を解析する。どちらにもマッチしない場合は
// `{ ok: false, reason }` を返す（呼び出し側は警告として列挙し、処理を中断しない）。
export function parseLegacyFilename(filename: string): ParseFilenameResult {
  const oldMatch = OLD_FORMAT.exec(filename);
  if (oldMatch) {
    const number = Number(oldMatch[1]);
    const title = oldMatch[2]!.trim();
    if (!isValidNumber(number)) {
      return { ok: false, reason: `invalid problem number in "${filename}"` };
    }
    if (!title) {
      return { ok: false, reason: `empty title in "${filename}"` };
    }
    return { ok: true, parsed: { kind: "old", number, title } };
  }

  const newMatch = NEW_FORMAT.exec(filename);
  if (newMatch) {
    const number = Number(newMatch[1]);
    const rest = newMatch[2]!;
    if (!isValidNumber(number)) {
      return { ok: false, reason: `invalid problem number in "${filename}"` };
    }

    const suffixMatch = TRAILING_ATTEMPT_NUMBER.exec(rest);
    if (suffixMatch) {
      const slug = suffixMatch[1]!;
      const attemptNumber = Number(suffixMatch[2]);
      if (!slug || !isValidNumber(attemptNumber)) {
        return { ok: false, reason: `unrecognized filename format: "${filename}"` };
      }
      return { ok: true, parsed: { kind: "new", number, slug, attemptNumber } };
    }

    if (!rest) {
      return { ok: false, reason: `empty slug in "${filename}"` };
    }
    return { ok: true, parsed: { kind: "new", number, slug: rest } };
  }

  return { ok: false, reason: `unrecognized filename format: "${filename}"` };
}

// マスタに一致しない新形式ファイル（スラッグのみでタイトル情報を持たない）の customTitle を
// 補うためのベストエフォート・タイトル化。正式なタイトルはマスタ側にのみ存在するため、
// ハイフン区切りを単語区切りとみなして先頭大文字化するのみ（完全な英語タイトル復元は目的としない）。
export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
