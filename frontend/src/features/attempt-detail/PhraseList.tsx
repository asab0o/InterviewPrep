import type { Phrase } from "../../types/api";

export function PhraseList({ phrases }: { phrases: Phrase[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Phrases to remember</h2>
      {phrases.length === 0 ? <p className="mt-4 text-sm text-slate-400">登録されたフレーズはありません。</p> : (
        <ul className="mt-5 divide-y divide-slate-100">
          {phrases.map((phrase) => <li key={phrase.id} className="grid gap-1 py-4 sm:grid-cols-2 sm:gap-6"><p className="font-medium text-slate-800">{phrase.englishText}</p><p className="text-sm text-slate-500">{phrase.japaneseText}</p></li>)}
        </ul>
      )}
    </section>
  );
}
