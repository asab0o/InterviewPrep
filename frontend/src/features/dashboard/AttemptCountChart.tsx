import type { CoverageRow } from "../../types/api";

export function AttemptCountChart({ rows }: { rows: CoverageRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.totalAttempts));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">総アタック数</h2>
        <p className="mt-1 text-sm text-slate-500">繰り返し挑戦した回数を含みます</p>
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.categoryId} className="grid grid-cols-[minmax(7rem,1fr)_2fr_2rem] items-center gap-3 text-sm">
            <span className="truncate text-slate-600" title={row.categoryName}>{row.categoryName}</span>
            <div className="h-7 overflow-hidden rounded-md bg-slate-100">
              <div className="h-full min-w-px rounded-md bg-slate-800" style={{ width: `${(row.totalAttempts / max) * 100}%` }} />
            </div>
            <strong className="text-right tabular-nums text-slate-900">{row.totalAttempts}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
