import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createAttempt, getAttempt, updateAttempt } from "../api/attempts";
import { getCategories } from "../api/categories";
import { ApiError } from "../api/client";
import { getProblems } from "../api/problems";
import { AttemptForm } from "../features/attempt-form/AttemptForm";
import { editAttemptDefaults, newAttemptDefaults } from "../features/attempt-form/defaults";
import type { AttemptInput } from "../types/api";

export function AttemptFormPage() {
  const { id: idParam } = useParams();
  const isEditing = idParam !== undefined;
  const parsedId = Number(idParam);
  const id = isEditing && Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories, staleTime: 5 * 60_000 });
  const problems = useQuery({ queryKey: ["problems", "all"], queryFn: () => getProblems(), staleTime: 5 * 60_000 });
  const detail = useQuery({ queryKey: ["attempt", id], queryFn: () => getAttempt(id!), enabled: isEditing && id !== null, retry: false });
  const save = useMutation({
    mutationFn: (input: AttemptInput) => isEditing ? updateAttempt(id!, input) : createAttempt(input),
    onSuccess: async (attempt) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attempts"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["attempt", attempt.id] }),
      ]);
      navigate(`/attempts/${attempt.id}`, { replace: true });
    },
  });

  if (isEditing && id === null) return <FormNotFound />;
  if (categories.isPending || problems.isPending || (isEditing && detail.isPending)) return <FormSkeleton />;
  if (detail.error instanceof ApiError && detail.error.status === 404) return <FormNotFound />;
  if (categories.isError || problems.isError || (isEditing && detail.isError)) return <FormLoadError />;

  const initialValues = isEditing ? editAttemptDefaults(detail.data!) : newAttemptDefaults();
  const serverError = save.error instanceof ApiError ? save.error.message : save.isError ? "記録を保存できませんでした。" : null;
  return (
    <div className="space-y-6">
      <div><Link to={isEditing ? `/attempts/${id}` : "/attempts"} className="text-sm font-medium text-slate-500 hover:text-blue-700">← {isEditing ? "記録詳細へ" : "記録一覧へ"}</Link></div>
      <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Practice log</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">{isEditing ? "Edit attempt" : "New attempt"}</h1><p className="mt-2 text-sm text-slate-500">解答と学びを記録して、次の挑戦につなげます。</p></header>
      <AttemptForm
        key={isEditing ? `edit-${id}` : "new"}
        categories={categories.data}
        problems={problems.data}
        initialValues={initialValues}
        isEditing={isEditing}
        isSaving={save.isPending}
        serverError={serverError}
        onSubmit={(input) => save.mutate(input)}
      />
    </div>
  );
}

function FormSkeleton() {
  return <div aria-label="Attempt form loading" className="animate-pulse space-y-5"><div className="h-20 rounded-xl bg-slate-200" /><div className="grid gap-6 lg:grid-cols-2"><div className="h-[50rem] rounded-2xl bg-slate-200" /><div className="h-[35rem] rounded-2xl bg-slate-200" /></div></div>;
}

function FormNotFound() {
  return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><h1 className="text-xl font-semibold">編集する記録が見つかりません</h1><Link to="/attempts" className="mt-4 inline-block text-sm font-semibold text-blue-600">記録一覧へ戻る</Link></div>;
}

function FormLoadError() {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800">フォームに必要なデータを読み込めませんでした。</div>;
}
