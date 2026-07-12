import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { AttemptInput, Category, Problem } from "../../types/api";
import { PhraseEditor } from "./PhraseEditor";
import { ProblemAutocomplete } from "./ProblemAutocomplete";
import { TranscriptInput } from "./TranscriptInput";
import { attemptFormSchema, type AttemptFormValues } from "./schema";

type Props = {
  categories: Category[];
  problems: Problem[];
  initialValues: AttemptFormValues;
  isEditing: boolean;
  isSaving: boolean;
  serverError: string | null;
  onSubmit: (input: AttemptInput) => void;
};

const emptyToNull = (value: string): string | null => value.trim() || null;

export function AttemptForm(props: Props) {
  const methods = useForm<AttemptFormValues>({ resolver: zodResolver(attemptFormSchema), defaultValues: props.initialValues });
  const mode = methods.watch("problemMode");
  const submit = methods.handleSubmit((values) => props.onSubmit({
    date: values.date,
    problemId: mode === "master" ? values.problemId : null,
    customTitle: mode === "custom" ? emptyToNull(values.customTitle) : null,
    customNumber: mode === "custom" ? values.customNumber : null,
    categoryId: mode === "custom" ? values.categoryId : null,
    code: emptyToNull(values.code),
    problemStatement: emptyToNull(values.problemStatement),
    videoUrl: emptyToNull(values.videoUrl),
    transcript: emptyToNull(values.transcript),
    retrospective: emptyToNull(values.retrospective),
    umpireExplanation: emptyToNull(values.umpireExplanation),
    phrases: values.phrases.map((phrase) => ({ id: phrase.id, englishText: phrase.englishText.trim(), japaneseText: phrase.japaneseText.trim() })),
  }));

  return (
    <FormProvider {...methods}>
      <form onSubmit={(event) => void submit(event)} className="space-y-6" noValidate>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <label className="block text-sm font-medium text-slate-700">日付 <span className="text-red-600">*</span>
              <input type="date" {...methods.register("date")} className="mt-1.5 block w-full rounded-lg border-slate-300 text-sm" />
              {methods.formState.errors.date && <span role="alert" className="mt-1 block text-xs text-red-600">{methods.formState.errors.date.message}</span>}
            </label>
            <ProblemAutocomplete categories={props.categories} problems={props.problems} />
            <label className="block text-sm font-medium text-slate-700">コード
              <textarea {...methods.register("code")} rows={14} spellCheck={false} className="mt-1.5 block w-full rounded-lg border-slate-300 font-mono text-sm" placeholder="解答コードを貼り付けてください" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Video URL
              <input type="url" {...methods.register("videoUrl")} className="mt-1.5 block w-full rounded-lg border-slate-300 text-sm" placeholder="https://youtu.be/..." />
              {methods.formState.errors.videoUrl && <span role="alert" className="mt-1 block text-xs text-red-600">{methods.formState.errors.videoUrl.message}</span>}
            </label>
            <TranscriptInput />
            <label className="block text-sm font-medium text-slate-700">振り返り
              <textarea {...methods.register("retrospective")} rows={5} className="mt-1.5 block w-full rounded-lg border-slate-300 text-sm" placeholder="できなかったこと、つまずいた点" />
            </label>
            <PhraseEditor />
          </div>

          <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">UMPIRE</p><h2 className="mt-2 text-lg font-semibold text-slate-900">問題文と解説</h2><p className="mt-1 text-sm text-slate-500">AI生成は次の機能で追加します。今回は問題文を保存できます。</p></div>
            <label className="block text-sm font-medium text-slate-700">問題文
              <textarea {...methods.register("problemStatement")} rows={18} className="mt-1.5 block w-full rounded-lg border-slate-300 text-sm" placeholder="問題タイトルと本文を貼り付けてください" />
            </label>
            {props.initialValues.umpireExplanation && <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">保存済みUMPIRE解説</p><p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm text-slate-600">{props.initialValues.umpireExplanation}</p></div>}
          </aside>
        </div>

        {props.serverError && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{props.serverError}</p>}
        <div className="sticky bottom-4 flex justify-end rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <button type="submit" disabled={props.isSaving} className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {props.isSaving ? "保存しています…" : props.isEditing ? "変更を保存" : "記録を保存"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
