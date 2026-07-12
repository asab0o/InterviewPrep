import type { CoverageRow } from "../../types/api";

export function CoverageChart({ rows }: { rows: CoverageRow[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">カテゴリー別の網羅率</h2>
        <p className="mt-1 text-sm text-slate-500">挑戦済みのユニーク問題数 / マスタ問題数</p>
      </div>
      <div className="space-y-5">
        {rows.map((row) => {
          const percent = Math.round(row.coverageRate * 100);
          return (
            <div key={row.categoryId}>
              <div className="mb-2 flex items-end justify-between gap-4 text-sm">
                <span className="font-medium text-slate-700">{row.categoryName}</span>
                <span className="whitespace-nowrap text-slate-500"><strong className="text-slate-900">{percent}%</strong> · {row.uniqueSolved}/{row.masterTotal}</span>
              </div>
              <div
                role="progressbar"
                aria-label={`${row.categoryName} coverage`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-2.5 overflow-hidden rounded-full bg-slate-100"
              >
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-[width]" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
