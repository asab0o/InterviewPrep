import type { Category, Problem } from "../../types/api";

type Props = {
  categories: Category[];
  problems: Problem[];
  categoryId?: number;
  problemId?: number;
  onCategoryChange: (id?: number) => void;
  onProblemChange: (id?: number) => void;
  onClear: () => void;
};

const selectedId = (value: string): number | undefined => value === "" ? undefined : Number(value);

export function AttemptFilters(props: Props) {
  const hasFilters = props.categoryId !== undefined || props.problemId !== undefined;
  return (
    <section aria-label="記録の絞り込み" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_auto] lg:items-end">
        <label className="text-sm font-medium text-slate-700">
          カテゴリー
          <select value={props.categoryId ?? ""} onChange={(event) => props.onCategoryChange(selectedId(event.target.value))}
            className="mt-1.5 block w-full rounded-lg border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-blue-500">
            <option value="">すべてのカテゴリー</option>
            {props.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          問題
          <select value={props.problemId ?? ""} onChange={(event) => props.onProblemChange(selectedId(event.target.value))}
            className="mt-1.5 block w-full rounded-lg border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-blue-500">
            <option value="">すべての問題</option>
            {props.problems.map((problem) => <option key={problem.id} value={problem.id}>#{problem.number} {problem.title}</option>)}
          </select>
        </label>
        <button type="button" disabled={!hasFilters} onClick={props.onClear}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          絞り込みを解除
        </button>
      </div>
    </section>
  );
}
