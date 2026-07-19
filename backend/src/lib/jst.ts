// JST（Asia/Tokyo）基準の日付をサーバーTZに依存せず算出する純粋関数。
// フラッシュカード復習（quiz_logs.shown_date、src/quiz/service.ts）と過去データインポート
// （attempts.date、src/import/dates.ts）の両方から使う共通ロジックのため src/lib に置く
// （feature配下に置くと別featureからの参照になり依存の向きが分かりにくくなるため）。
const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// 引数のDateが表すJSTの暦日をYYYY-MM-DDで返す。引数省略時は「JSTでの今日」。
export function jstToday(now: Date = new Date()): string {
  // en-CA ロケールは YYYY-MM-DD 形式で整形される。
  return jstDateFormatter.format(now);
}
