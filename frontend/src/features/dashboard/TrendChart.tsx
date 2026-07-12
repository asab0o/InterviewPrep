import type { TrendGranularity, TrendPoint } from "../../types/api";

function formatPeriod(period: string, granularity: TrendGranularity): string {
  if (granularity === "monthly") {
    const [year, month] = period.split("-");
    return `${year}/${month}`;
  }
  return period.replace("-W", " W");
}

export function TrendChart({ points, granularity }: { points: TrendPoint[]; granularity: TrendGranularity }) {
  if (points.length === 0) return <EmptyTrend />;
  const max = Math.max(1, ...points.map((point) => point.attemptCount));
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex h-64 min-w-max items-end gap-3 border-b border-slate-200 px-1 sm:gap-5">
        {points.map((point) => (
          <div key={point.period} className="flex h-full w-14 flex-col items-center justify-end sm:w-16">
            <span className="mb-2 text-xs font-semibold tabular-nums text-slate-700">{point.attemptCount}</span>
            <div
              aria-label={`${formatPeriod(point.period, granularity)}: ${point.attemptCount} attempts`}
              className="w-8 rounded-t-md bg-gradient-to-t from-blue-700 to-blue-400 sm:w-10"
              style={{ height: `${Math.max(4, (point.attemptCount / max) * 180)}px` }}
            />
            <span className="mt-2 whitespace-nowrap text-[11px] text-slate-500">{formatPeriod(point.period, granularity)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyTrend() {
  return <div className="grid h-64 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500">記録を追加すると学習量の推移が表示されます。</div>;
}
