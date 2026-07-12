import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { translatePhrase } from "../../api/translate";
import { ApiError } from "../../api/client";
import type { AttemptFormValues } from "./schema";

type Props = {
  englishDraft: string;
  onEnglishDraftChange: (value: string) => void;
};

export function PhraseEditor({ englishDraft, onEnglishDraftChange }: Props) {
  const { control, register, formState: { errors } } = useFormContext<AttemptFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "phrases", keyName: "_key" });
  const [japanese, setJapanese] = useState("");

  const translate = useMutation({
    mutationFn: (english: string) => translatePhrase({ english }),
    // Guard against a race condition: if the user changes englishDraft after the request was
    // sent but before the response arrives, `requestedEnglish` (captured at mutate() time) no
    // longer matches the *current* englishDraft, so the stale response must be discarded rather
    // than overwriting the Japanese field with a translation of text the user already moved on
    // from (would otherwise save a mismatched English/Japanese pair).
    onSuccess: (result, requestedEnglish) => {
      if (requestedEnglish === englishDraft) setJapanese(result.japanese);
    },
  });

  function handleEnglishChange(value: string) {
    onEnglishDraftChange(value);
    if (translate.isError) translate.reset();
  }

  function addPhrase() {
    if (!englishDraft.trim() || !japanese.trim()) return;
    append({ englishText: englishDraft.trim(), japaneseText: japanese.trim() });
    onEnglishDraftChange("");
    setJapanese("");
    translate.reset();
  }

  const translateError = translate.error instanceof ApiError
    ? translate.error.message
    : translate.isError
      ? "翻訳サジェストを取得できませんでした。"
      : null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">Phrases to remember</h2>
        <p className="mt-1 text-xs text-slate-500">英語フレーズを入力して翻訳サジェストを使うか、日本語訳を直接入力してください。</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <input
            aria-label="追加する英語フレーズ"
            value={englishDraft}
            onChange={(event) => handleEnglishChange(event.target.value)}
            className="block w-full rounded-lg border-slate-300 text-sm"
            placeholder="English phrase"
          />
          <button
            type="button"
            onClick={() => translate.mutate(englishDraft.trim())}
            disabled={!englishDraft.trim() || translate.isPending}
            className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
          >
            {translate.isPending ? "翻訳中…" : "翻訳"}
          </button>
          {translateError && <p role="alert" className="text-xs text-red-600">{translateError}</p>}
        </div>
        <input
          aria-label="追加する日本語訳"
          value={japanese}
          onChange={(event) => setJapanese(event.target.value)}
          className="rounded-lg border-slate-300 text-sm"
          placeholder="日本語訳（サジェストを編集できます）"
        />
      </div>
      <button type="button" onClick={addPhrase} disabled={!englishDraft.trim() || !japanese.trim()} className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40">フレーズを追加</button>
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
