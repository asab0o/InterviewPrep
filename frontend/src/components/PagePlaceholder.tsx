import type { ReactNode } from "react";

export function PagePlaceholder({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Interview Prep</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">{description}</p>
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
        {children ?? "この画面は次の機能実装で接続します。"}
      </div>
    </section>
  );
}
