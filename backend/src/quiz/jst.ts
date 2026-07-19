// JST（Asia/Tokyo）基準の「今日」の日付をサーバーTZに依存せず算出する純粋関数。
// quiz_logs.shown_date（YYYY-MM-DD）との比較に用いる。
const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function jstToday(now: Date = new Date()): string {
  // en-CA ロケールは YYYY-MM-DD 形式で整形される。
  return jstDateFormatter.format(now);
}
