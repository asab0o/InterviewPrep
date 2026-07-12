import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { checkGithubPush, pushToGithub } from "../../api/github";
import { ApiError } from "../../api/client";
import type { AttemptDetail, GithubCheckResponse } from "../../types/api";
import { buildMarkdown } from "./buildMarkdown";
import { OverwriteWarningDialog } from "./OverwriteWarningDialog";

type Props = { attempt: AttemptDetail };

const FIELD_ERROR_CODES = new Set(["CATEGORY_REQUIRED", "NUMBER_REQUIRED", "TITLE_REQUIRED"]);

/**
 * 記録詳細画面のGitHub pushボタン（要件5.4）。
 * クリック→check→（必要なら）確認/警告ダイアログ→pushの一連のフローを管理する。
 */
export function PushButton({ attempt }: Props) {
  const queryClient = useQueryClient();
  const [checkResult, setCheckResult] = useState<GithubCheckResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<{ path: string; commitUrl: string } | null>(null);

  const check = useMutation({
    mutationFn: () => checkGithubPush(attempt.id),
    onSuccess: (data) => {
      setSuccessMessage(null);
      setCheckResult(data);
    },
  });

  const push = useMutation({
    mutationFn: (input: { content: string | undefined; force: boolean | undefined }) =>
      pushToGithub({ attemptId: attempt.id, content: input.content, force: input.force }),
    onSuccess: async (data) => {
      setCheckResult(null);
      setSuccessMessage({ path: data.path, commitUrl: data.commitUrl });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attempt", attempt.id] }),
        queryClient.invalidateQueries({ queryKey: ["attempts"] }),
      ]);
    },
  });

  function handleClick() {
    // push中は再check/再push経路そのものを塞ぐ（High 1）。OverwriteWarningDialog側でも
    // push中は閉じ操作を無効化しているが、万一の並行実行を防ぐための二重の防御。
    if (push.isPending) return;
    setSuccessMessage(null);
    check.reset();
    check.mutate();
  }

  function closeDialog() {
    setCheckResult(null);
    push.reset();
  }

  const checkError = check.error instanceof ApiError ? check.error : null;
  const isFieldError = checkError !== null && FIELD_ERROR_CODES.has(checkError.code);
  const pushErrorMessage = push.error instanceof ApiError
    ? push.error.message
    : push.isError
      ? "pushに失敗しました。時間をおいて再度お試しください。"
      : null;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={check.isPending || push.isPending}
        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {check.isPending ? "確認中…" : attempt.githubPushed ? "GitHubを更新" : "GitHubへpush"}
      </button>

      {checkError && (
        <p role="alert" className="max-w-xs text-right text-xs text-red-600">
          {checkError.message}
          {isFieldError && (
            <>
              {" "}
              <Link to={`/attempts/${attempt.id}/edit`} className="font-semibold underline">
                編集画面で設定してください
              </Link>
            </>
          )}
        </p>
      )}

      {successMessage && (
        <p className="max-w-xs text-right text-xs text-emerald-700">
          pushしました：
          {" "}
          <a href={successMessage.commitUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
            {successMessage.path}
          </a>
        </p>
      )}

      {checkResult && (
        <OverwriteWarningDialog
          path={checkResult.path}
          exists={checkResult.exists}
          createdByApp={checkResult.createdByApp}
          initialMarkdown={buildMarkdown({
            number: attempt.number,
            title: attempt.title,
            attemptNumber: attempt.attemptNumber,
            date: attempt.date,
            code: attempt.code,
            phrases: attempt.phrases,
            retrospective: attempt.retrospective,
          })}
          isPushing={push.isPending}
          pushError={pushErrorMessage}
          onClose={closeDialog}
          // onPushはOverwriteWarningDialogのblocked分岐（exists && !createdByApp）ではpushボタン自体が
          // 描画されないため呼ばれない。ここに到達するのは exists===false（新規push）か
          // exists===true && createdByApp===true（上書き警告に同意したforce push）のいずれかのみ。
          onPush={(content) => push.mutate({ content, force: checkResult.exists ? true : undefined })}
        />
      )}
    </div>
  );
}
