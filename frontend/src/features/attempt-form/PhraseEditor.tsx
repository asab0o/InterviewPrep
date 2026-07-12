import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { AttemptFormValues } from "./schema";

export function PhraseEditor() {
  const { control, register, formState: { errors } } = useFormContext<AttemptFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "phrases", keyName: "_key" });
  const [english, setEnglish] = useState("");
  const [japanese, setJapanese] = useState("");

  function addPhrase() {
    if (!english.trim() || !japanese.trim()) return;
    append({ englishText: english.trim(), japaneseText: japanese.trim() });
    setEnglish("");
    setJapanese("");
  }

  return (
    <section className="space-y-4">
      <div><h2 className="font-semibold text-slate-900">Phrases to remember</h2><p className="mt-1 text-xs text-slate-500">翻訳サジェストは次の機能で追加します。現在は手動入力できます。</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input aria-label="追加する英語フレーズ" value={english} onChange={(event) => setEnglish(event.target.value)} className="rounded-lg border-slate-300 text-sm" placeholder="English phrase" />
        <input aria-label="追加する日本語訳" value={japanese} onChange={(event) => setJapanese(event.target.value)} className="rounded-lg border-slate-300 text-sm" placeholder="日本語訳" />
      </div>
      <button type="button" onClick={addPhrase} disabled={!english.trim() || !japanese.trim()} className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40">フレーズを追加</button>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field._key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input type="hidden" {...register(`phrases.${index}.id`, { setValueAs: (value) => value === "" ? undefined : Number(value) })} />
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
              <input aria-label={`英語フレーズ ${index + 1}`} {...register(`phrases.${index}.englishText`)} className="rounded-lg border-slate-300 text-sm" />
              <input aria-label={`日本語訳 ${index + 1}`} {...register(`phrases.${index}.japaneseText`)} className="rounded-lg border-slate-300 text-sm" />
              <button type="button" onClick={() => remove(index)} className="px-2 py-2 text-sm font-medium text-red-600">削除</button>
            </div>
            {(errors.phrases?.[index]?.englishText || errors.phrases?.[index]?.japaneseText) && <p role="alert" className="mt-2 text-xs text-red-600">英語と日本語訳を入力してください。</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
