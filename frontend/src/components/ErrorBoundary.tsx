import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "予期しないエラーが発生しました。";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div role="alert" className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="font-semibold text-red-900">画面を表示できませんでした</h1>
        <p className="mt-2 text-sm text-red-700">{message}</p>
        <a href="/" className="mt-5 inline-block rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">トップへ戻る</a>
      </div>
    </main>
  );
}
