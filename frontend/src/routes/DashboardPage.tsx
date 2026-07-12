import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AttemptCountChart } from "../features/dashboard/AttemptCountChart";
import { CoverageChart } from "../features/dashboard/CoverageChart";
import { TrendChart } from "../features/dashboard/TrendChart";
import { useDashboard } from "../features/dashboard/useDashboard";
import type { TrendGranularity } from "../types/api";

export function DashboardPage() {
  const [granularity, setGranularity] = useState<TrendGranularity>("weekly");
  const { coverage, trend } = useDashboard(granularity);
  const summary = useMemo(() => {
    const rows = coverage.data ?? [];
    const solved = rows.reduce((sum, row) => sum + row.uniqueSolved, 0);
    const total = rows.reduce((sum, row) => sum + row.masterTotal, 0);
    const attempts = rows.reduce((sum, row) => sum + row.totalAttempts, 0);
    return { solved, total, attempts, rate: total === 0 ? 0 : Math.round((solved / total) * 100) };
  }, [coverage.data]);

  if (coverage.isPending || trend.isPending) return <DashboardSkeleton />;
  if (coverage.isError || trend.isError) {
    return <DashboardError onRetry={() => { void coverage.refetch(); void trend.refetch(); }} />;
  }
  const rows = coverage.data;

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Learning overview</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">学習の積み重ねと、次に取り組むカテゴリーを確認しましょう。</p>
        </div>
        <Link to="/attempts/new" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">新しい記録を追加</Link>
      </header>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Solved problems" value={`${summary.solved} / ${summary.total}`} note="ユニーク問題数" />
        <SummaryCard label="Overall coverage" value={`${summary.rate}%`} note="対象カテゴリー全体" />
        <SummaryCard label="Total attempts" value={String(summary.attempts)} note="マスタ紐付きの挑戦" />
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">表示できるカテゴリーがありません。</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <CoverageChart rows={rows} />
          <AttemptCountChart rows={rows} />
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">学習量の推移</h2>
            <p className="mt-1 text-sm text-slate-500">マスタ外を含む、すべての挑戦記録</p>
          </div>
          <div className="inline-flex self-start rounded-lg bg-slate-100 p-1" aria-label="Trend period">
            {(["weekly", "monthly"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setGranularity(value)} aria-pressed={granularity === value}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${granularity === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                {value === "weekly" ? "週次" : "月次"}
              </button>
            ))}
          </div>
        </div>
        <TrendChart points={trend.data.points} granularity={granularity} />
      </section>
    </div>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></article>;
}

function DashboardSkeleton() {
  return <div aria-label="Dashboard loading" className="animate-pulse space-y-6"><div className="h-20 rounded-xl bg-slate-200" /><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-32 rounded-2xl bg-slate-200" />)}</div><div className="h-80 rounded-2xl bg-slate-200" /></div>;
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><h1 className="font-semibold text-red-900">ダッシュボードを読み込めませんでした</h1><p className="mt-2 text-sm text-red-700">通信状態を確認して、もう一度お試しください。</p><button type="button" onClick={onRetry} className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">再読み込み</button></div>;
}
