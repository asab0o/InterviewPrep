export function TranscriptView({ transcript }: { transcript: string }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white" open>
      <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-800 marker:hidden">文字起こし <span className="float-right text-slate-400 group-open:rotate-180">⌄</span></summary>
      <div className="border-t border-slate-100 px-5 py-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{transcript}</div>
    </details>
  );
}
