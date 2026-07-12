import { Link } from "react-router-dom";
import type { AttemptListItem } from "../../types/api";

const formatDate = (date: string) => date.replaceAll("-", ".");

export function AttemptTable({ attempts }: { attempts: AttemptListItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[7rem_1fr_10rem_7rem_6rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid">
        <span>Date</span><span>Problem</span><span>Category</span><span>Attempt</span><span>Status</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {attempts.map((attempt) => (
          <li key={attempt.id}>
            <Link to={`/attempts/${attempt.id}`} className="grid gap-3 px-5 py-5 transition hover:bg-blue-50/50 md:grid-cols-[7rem_1fr_10rem_7rem_6rem] md:items-center md:gap-4">
              <time dateTime={attempt.date} className="text-xs font-medium text-slate-500 md:text-sm">{formatDate(attempt.date)}</time>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{attempt.number !== null && <span className="mr-1.5 text-slate-400">#{attempt.number}</span>}{attempt.title}</p>
                <p className="mt-1 text-xs text-slate-500 md:hidden">{attempt.categoryName ?? "カテゴリーなし"} · Attempt {attempt.attemptNumber}</p>
              </div>
              <span className="hidden truncate text-sm text-slate-600 md:block">{attempt.categoryName ?? "—"}</span>
              <span className="hidden text-sm text-slate-600 md:block">#{attempt.attemptNumber}</span>
              <div className="flex gap-2" aria-label="記録状態">
                {attempt.hasVideo && <StatusBadge label="Video" tone="blue" />}
                {attempt.githubPushed && <StatusBadge label="GitHub" tone="green" />}
                {!attempt.hasVideo && !attempt.githubPushed && <span className="text-xs text-slate-400">—</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "blue" | "green" }) {
  const color = tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${color}`}>{label}</span>;
}
