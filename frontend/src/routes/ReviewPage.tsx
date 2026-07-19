import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { QUIZ_CHECKING_MESSAGE } from "../features/review/messages";
import { useQuizToday } from "../features/review/useQuizToday";

const CARD_HINT_ID = "review-card-hint";

export function ReviewPage() {
  const navigate = useNavigate();
  const quiz = useQuizToday();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (quiz.isPending) return <p className="text-sm text-slate-600">{QUIZ_CHECKING_MESSAGE}</p>;
  if (quiz.isError) return <Navigate to="/dashboard" replace />;

  const { alreadyShownToday, cards } = quiz.data;
  // 出題対象が無い（出題済み／ストック0件）場合は復習画面を出さずダッシュボードへ。
  // `/review` への直接アクセスもここで弾かれる。
  if (alreadyShownToday || cards.length === 0) return <Navigate to="/dashboard" replace />;

  const safeIndex = Math.min(index, cards.length - 1);
  const card = cards[safeIndex];
  const isLast = safeIndex === cards.length - 1;

  function handleClose() {
    navigate("/dashboard", { replace: true });
  }

  function handleNext() {
    if (isLast) {
      // 要件どおり、完了メッセージは表示せずそのままダッシュボードへ遷移する。
      navigate("/dashboard", { replace: true });
      return;
    }
    setIndex((current) => current + 1);
    setFlipped(false);
  }

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col">
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={handleClose}
          aria-label="復習を閉じてダッシュボードへ戻る"
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <span aria-hidden="true">×</span>
          閉じる
        </button>
        <p className="text-sm font-medium text-slate-500" aria-live="polite">
          {safeIndex + 1} / {cards.length}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        {/*
          アクセシブルネームは aria-label で上書きせず、可視のフレーズ本文（日本語訳／英語）を
          そのままボタンの名前として露出させる（スクリーンリーダー利用者にも本文が読まれるように）。
          操作方法の補足は aria-describedby で別要素の説明文を参照する形にする。
        */}
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          aria-pressed={flipped}
          aria-describedby={CARD_HINT_ID}
          className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-colors hover:border-blue-300 sm:h-72"
        >
          {flipped ? (
            <div key={`en-${card.phraseId}`} className="flex animate-card-flip flex-col items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">English</span>
              <span className="text-2xl font-bold text-slate-950">{card.englishText}</span>
            </div>
          ) : (
            <div key={`ja-${card.phraseId}`} className="flex animate-card-flip flex-col items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">日本語</span>
              <span className="text-2xl font-bold text-slate-950">{card.japaneseText}</span>
            </div>
          )}
        </button>
        <p id={CARD_HINT_ID} className="text-xs text-slate-400">
          {flipped ? "タップ／クリックで日本語訳に戻す" : "タップ／クリックで英語を表示"}
        </p>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
