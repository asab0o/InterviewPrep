import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { PhraseList } from "../features/attempt-detail/PhraseList";
import { TranscriptView } from "../features/attempt-detail/TranscriptView";
import { YouTubeEmbed } from "../features/attempt-detail/YouTubeEmbed";
import { useAttemptDetail } from "../features/attempt-detail/useAttemptDetail";
import { PushButton } from "../features/github/PushButton";

export function AttemptDetailPage() {
  const { id: idParam } = useParams();
  const parsedId = Number(idParam);
  const id = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const attempt = useAttemptDetail(id);

  if (id === null) return <NotFound />;
  if (attempt.isPending) return <DetailSkeleton />;
  if (attempt.error instanceof ApiError && attempt.error.status === 404) return <NotFound />;
  if (attempt.isError) return <DetailError onRetry={() => void attempt.refetch()} />;
  const data = attempt.data;

  return (
    <article className="space-y-6">
      <div><Link to="/attempts" className="text-sm font-medium text-slate-500 hover:text-blue-700">← 記録一覧へ</Link></div>
      <header className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <time dateTime={data.date}>{data.date.replaceAll("-", ".")}</time><span>·</span><span>Attempt {data.attemptNumber}</span>
            {data.githubPushed && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">GitHub pushed</span>}
          </div>
          <h1 className="break-words text-3xl font-bold tracking-tight text-slate-950">{data.number !== null && <span className="mr-2 text-slate-400">#{data.number}</span>}{data.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{data.categoryName ?? "カテゴリーなし"}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:items-start">
          <Link to={`/attempts/${data.id}/edit`} className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">編集する</Link>
          {/* key={data.id}: ルートは同一要素のparamのみ変更されるため再マウントされない。attempt切り替え時に
              PushButton内部のuseState（checkResult/successMessage）やmutation状態が別記録に持ち越されて
              誤表示されるのを防ぐため、attempt.id が変わったら強制的に再マウントする（High 2）。 */}
          <PushButton key={data.id} attempt={data} />
        </div>
      </header>

      <Section title="Code">
        {data.code ? <pre className="overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm leading-6 text-slate-100"><code>{data.code}</code></pre> : <EmptyText>コードは登録されていません。</EmptyText>}
      </Section>

      {data.videoUrl && <Section title="Practice video"><YouTubeEmbed url={data.videoUrl} /></Section>}

      {/* 要件5.8：文字起こしはUMPIRE解説と読み比べやすいよう同一画面内に並べて配置する */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {data.umpireExplanation && <Section title="UMPIRE explanation"><div className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{data.umpireExplanation}</div></Section>}
        {data.transcript && <TranscriptView transcript={data.transcript} />}
      </div>

      {data.problemStatement && <Section title="Problem statement"><div className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{data.problemStatement}</div></Section>}
      <PhraseList phrases={data.phrases} />

      {data.retrospective && <Section title="Could Not Do"><div className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{data.retrospective}</div></Section>}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-5 text-lg font-semibold text-slate-900">{title}</h2>{children}</section>;
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}

function NotFound() {
  return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><h1 className="text-xl font-semibold">記録が見つかりません</h1><Link to="/attempts" className="mt-4 inline-block text-sm font-semibold text-blue-600">記録一覧へ戻る</Link></div>;
}

function DetailSkeleton() {
  return <div aria-label="Attempt detail loading" className="animate-pulse space-y-5"><div className="h-8 w-28 rounded bg-slate-200" /><div className="h-40 rounded-2xl bg-slate-200" /><div className="h-72 rounded-2xl bg-slate-200" /></div>;
}

function DetailError({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><h1 className="font-semibold text-red-900">記録を読み込めませんでした</h1><button type="button" onClick={onRetry} className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">再読み込み</button></div>;
}
