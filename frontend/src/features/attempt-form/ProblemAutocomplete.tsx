import { useFormContext } from "react-hook-form";
import type { Category, Problem } from "../../types/api";
import type { AttemptFormValues } from "./schema";

const numberOrNull = (value: unknown) => value === "" ? null : Number(value);

export function ProblemAutocomplete({ categories, problems }: { categories: Category[]; problems: Problem[] }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<AttemptFormValues>();
  const categoryId = watch("categoryId");
  const mode = watch("problemMode");
  const candidates = categoryId === null ? [] : problems.filter((problem) => problem.categoryId === categoryId);

  return (
    <div className="space-y-5">
      <label className="block text-sm font-medium text-slate-700">カテゴリー <span className="text-red-600">*</span>
        <select {...register("categoryId", { setValueAs: numberOrNull })} onChange={(event) => {
          setValue("categoryId", numberOrNull(event.target.value), { shouldValidate: true });
          setValue("problemId", null);
        }} className="mt-1.5 block w-full rounded-lg border-slate-300 text-sm">
          <option value="">選択してください</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <FieldError message={errors.categoryId?.message} />
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">問題の種類</legend>
        <div className="mt-2 flex gap-5 text-sm text-slate-600">
          <label className="flex items-center gap-2"><input type="radio" value="master" {...register("problemMode")} /> マスタから選択</label>
          <label className="flex items-center gap-2"><input type="radio" value="custom" {...register("problemMode")} /> マスタ外</label>
        </div>
      </fieldset>

      {mode === "master" ? (
        <label className="block text-sm font-medium text-slate-700">問題 <span className="text-red-600">*</span>
          <select {...register("problemId", { setValueAs: numberOrNull })} className="mt-1.5 block w-full rounded-lg border-slate-300 text-sm" disabled={categoryId === null}>
            <option value="">{categoryId === null ? "先にカテゴリーを選択" : "問題を選択"}</option>
            {candidates.map((problem) => <option key={problem.id} value={problem.id}>#{problem.number} {problem.title}</option>)}
          </select>
          <FieldError message={errors.problemId?.message} />
        </label>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <label className="block text-sm font-medium text-slate-700">問題名 <span className="text-red-600">*</span>
            <input {...register("customTitle")} className="mt-1.5 block w-full rounded-lg border-slate-300 text-sm" placeholder="例: Design Twitter" />
            <FieldError message={errors.customTitle?.message} />
          </label>
          <label className="block text-sm font-medium text-slate-700">問題番号
            <input type="number" {...register("customNumber", { setValueAs: numberOrNull })} className="mt-1.5 block w-full rounded-lg border-slate-300 text-sm" />
          </label>
        </div>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <span role="alert" className="mt-1 block text-xs text-red-600">{message}</span> : null;
}
