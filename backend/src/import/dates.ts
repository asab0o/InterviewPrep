// 過去データインポート（5.7）における日付解決の純粋関数群。
// attempts.dateはYYYY-MM-DDのテキストのみを保持するため、GitHub Commits API / `git log` から
// 得られるISO日時文字列をここで日付のみに正規化する。
//
// JST基準で日付を切り出す（`src/lib/jst.ts` の `jstToday` を再利用）。単純に
// `new Date(iso).toISOString().slice(0, 10)` としてUTC変換後に切り出すと、JSTで
// 00:00〜08:59台のコミット（本アプリの主な利用シーンである深夜の学習・コミットに該当しうる）が
// 前日の日付として記録されてしまうため（例: "2024-01-01T00:30:00+09:00" が "2023-12-31" になる）。
import { jstToday } from "../lib/jst";

// ISO日時文字列（や日付文字列）→ JST基準のYYYY-MM-DD。パース不能なら null（呼び出し側でフォールバックする）。
export function toDateOnly(isoOrNull: string | null | undefined): string | null {
  if (!isoOrNull) return null;
  const parsed = new Date(isoOrNull);
  if (Number.isNaN(parsed.getTime())) return null;
  return jstToday(parsed);
}

export function todayDateOnly(): string {
  return jstToday();
}
