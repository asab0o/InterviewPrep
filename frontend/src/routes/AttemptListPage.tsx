import { useState } from "react";
import { Link } from "react-router-dom";
import { AttemptFilters } from "../features/attempt-list/AttemptFilters";
import { AttemptTable } from "../features/attempt-list/AttemptTable";
import { useAttempts } from "../features/attempt-list/useAttempts";
import type { AttemptFilters as FilterState } from "../types/api";

export function AttemptListPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const { attempts, categories, problems } = useAttempts(filters);
  const isPending = attempts.isPending || categories.isPending || problems.isPending;
  const isError = attempts.isError || categories.isError || problems.isError;

  if (isPending) return <AttemptListSkeleton />;
  if (isError) {
    return <AttemptListError onRetry={() => { void attempts.refetch(); void categories.refetch(); void problems.refetch(); }} />;
  }

  const hasFilters = filters.categoryId !== undefined || filters.problemId !== undefined;
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Practice history</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Attempts</h1>
          <p className="mt-2 text-sm text-slate-500">これまでの挑戦を振り返り、次の復習につなげます。</p>
        </div>
        <Link to="/attempts/new" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">新しい記録を追加</Link>
      </header>

      <AttemptFilters
        categories={categories.data}
        problems={problems.data}
        categoryId={filters.categoryId}
        problemId={filters.problemId}
        onCategoryChange={(categoryId) => setFilters(categoryId === undefined ? {} : { categoryId })}
        onProblemChange={(problemId) => setFilters((current) => ({ ...current, problemId }))}
        onClear={() => setFilters({})}
      />

      <div className="flex items-center justify-between text-sm text-slate-500">
        <p><strong className="text-slate-900">{attempts.data.length}</strong> 件の記録</p>
        {hasFilters && <span>絞り込み中</span>}
      </div>

      {attempts.data.length > 0
        ? <AttemptTable attempts={attempts.data} />
        : <EmptyAttempts filtered={hasFilters} onClear={() => setFilters({})} />}
    </div>
  );
}

function EmptyAttempts({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <h2 className="font-semibold text-slate-800">{filtered ? "条件に一致する記録がありません" : "まだ記録がありません"}</h2>
      <p className="mt-2 text-sm text-slate-500">{filtered ? "絞り込み条件を変更してみてください。" : "問題を解いたら、最初の挑戦を記録しましょう。"}</p>
      {filtered
        ? <button type="button" onClick={onClear} className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-800">絞り込みを解除</button>
        : <Link to="/attempts/new" className="mt-5 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800">記録を作成する →</Link>}
    </div>
  );
}

function AttemptListSkeleton() {
  return <div aria-label="Attempts loading" className="animate-pulse space-y-5"><div className="h-20 rounded-xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div>;
}

function AttemptListError({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><h1 className="font-semibold text-red-900">記録一覧を読み込めませんでした</h1><p className="mt-2 text-sm text-red-700">通信状態を確認して、もう一度お試しください。</p><button type="button" onClick={onRetry} className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">再読み込み</button></div>;
}
