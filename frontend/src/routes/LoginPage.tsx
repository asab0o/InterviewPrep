import { Navigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useMe } from "../features/auth/useMe";

export function LoginPage() {
  const me = useMe();
  if (me.isSuccess) return <Navigate to="/" replace />;
  if (me.isPending) return <main className="grid min-h-screen place-items-center text-sm text-slate-600">読み込み中…</main>;
  if (!(me.error instanceof ApiError) || me.error.status !== 401) {
    return <main className="grid min-h-screen place-items-center p-6 text-center text-sm text-red-700">サーバーに接続できませんでした。</main>;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl sm:p-10">
        <p className="text-sm font-semibold text-blue-600">INTERVIEW PREP</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">学習記録を、ひとつに。</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">問題への挑戦、英語フレーズ、進捗を一か所で管理します。</p>
        <a href="/auth/github" className="mt-8 flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
          GitHubでログイン
        </a>
      </section>
    </main>
  );
}
