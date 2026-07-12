import { useFormContext } from "react-hook-form";
import { AddToPhrasesPopover } from "./AddToPhrasesPopover";
import type { AttemptFormValues } from "./schema";

type Props = {
  mode: "master" | "custom";
  isGenerating: boolean;
  generateError: string | null;
  generateDisabled: boolean;
  umpireText: string | null;
  umpireCached: boolean | null;
  onGenerate: (force: boolean) => void;
  onAddPhrase: (text: string) => void;
};

export function UmpirePanel({ mode, isGenerating, generateError, generateDisabled, umpireText, umpireCached, onGenerate, onAddPhrase }: Props) {
  const { register } = useFormContext<AttemptFormValues>();

  return (
    <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">UMPIRE</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">問題文と解説</h2>
        <p className="mt-1 text-sm text-slate-500">問題文を貼り付けてUMPIRE解説を生成します。問題名の入力・選択は先頭行に自動反映されます。</p>
      </div>
      <label className="block text-sm font-medium text-slate-700">問題文
        <textarea {...register("problemStatement")} rows={14} className="mt-1.5 block w-full rounded-lg border-slate-300 text-sm" placeholder="問題タイトルと本文を貼り付けてください" />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onGenerate(false)} disabled={generateDisabled} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
          {isGenerating ? "生成中…" : "UMPIRE解説を生成"}
        </button>
        {mode === "master" && (
          <button type="button" onClick={() => onGenerate(true)} disabled={generateDisabled} className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40">
            再生成
          </button>
        )}
      </div>
      {generateError && <p role="alert" className="text-xs text-red-600">{generateError}</p>}

      {umpireText && (
        <div>
          {umpireCached === true && <p className="mb-1 text-xs font-medium text-slate-400">保存済みの解説を再利用しました</p>}
          <AddToPhrasesPopover onAdd={onAddPhrase} className="relative">
            <div className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700 select-text">
              {umpireText}
            </div>
          </AddToPhrasesPopover>
        </div>
      )}
    </aside>
  );
}
