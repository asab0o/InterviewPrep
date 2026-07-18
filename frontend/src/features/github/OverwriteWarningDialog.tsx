import { useEffect, useRef, useState } from "react";

type Props = {
  path: string;
  exists: boolean;
  createdByApp: boolean;
  initialMarkdown: string;
  isPushing: boolean;
  pushError: string | null;
  onClose: () => void;
  onPush: (content: string | undefined) => void;
};

/**
 * 記録詳細のGitHub push確認ダイアログ（要件5.4）。設計書では「OverwriteWarningDialog」という名前だが、
 * 通常確認（新規push・Markdownプレビュー編集）と上書き警告を1つのダイアログで兼ねる：
 * - exists=false: 新規pushの確認＋プレビュー編集
 * - exists=true, createdByApp=true: 上書き警告＋プレビュー編集（続行でforce push）
 * - exists=true, createdByApp=false: アプリ管理外ファイルのため push 不可の案内のみ（Q7）
 */
export function OverwriteWarningDialog({
  path,
  exists,
  createdByApp,
  initialMarkdown,
  isPushing,
  pushError,
  onClose,
  onPush,
}: Props) {
  const [edited, setEdited] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const blocked = exists && !createdByApp;

  // push中は✕/Escape/オーバーレイクリックも含めて一切閉じられないようにする（High 1）。
  // ローカルstateだけ消して進行中のfetchを放置すると、閉じた直後に本体ボタンから再度push
  // できてしまい、二重pushを誘発するため。
  const closeGuarded = () => {
    if (isPushing) return;
    onClose();
  };

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeGuarded();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isPushing]);

  // checkResultが更新されて別のpath/対象になった場合に、前回のプレビュー編集内容を持ち越さない
  // ための防御（Medium 3）。push実行中の再check経路はPushButton側で塞いでいるが、念のため。
  useEffect(() => {
    setEdited(null);
  }, [path]);

  const markdown = edited ?? initialMarkdown;
  const titleText = blocked ? "pushできません" : exists ? "上書きの確認" : "GitHubへpush";

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeGuarded();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-push-dialog-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="github-push-dialog-title" className="text-lg font-semibold text-slate-900">{titleText}</h2>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={closeGuarded}
            disabled={isPushing}
            aria-label="ダイアログを閉じる"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">{path}</p>

        {blocked ? (
          <div className="mt-4 space-y-4">
            <p role="alert" className="text-sm text-red-700">
              このファイルはアプリ管理外のため上書きできません。
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeGuarded}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                閉じる
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {exists && (
              <p role="alert" className="text-sm font-medium text-amber-700">
                同名ファイルが既に存在します。上書きしますか？
              </p>
            )}
            <label className="block text-sm font-medium text-slate-700">
              Markdownプレビュー（編集可能）
              <textarea
                value={markdown}
                onChange={(event) => setEdited(event.target.value)}
                rows={14}
                className="mt-1.5 block w-full rounded-lg border-slate-300 font-mono text-xs"
              />
            </label>
            {pushError && <p role="alert" className="text-xs text-red-600">{pushError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeGuarded}
                disabled={isPushing}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => onPush(edited ?? undefined)}
                disabled={isPushing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPushing ? "push中…" : exists ? "上書きしてpushする" : "pushする"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
