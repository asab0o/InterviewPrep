import { useQuery } from "@tanstack/react-query";
import { getQuizToday } from "../../api/quiz";

export const quizTodayQueryKey = ["quiz", "today"] as const;

/**
 * `GET /api/quiz/today` はサーバー側で「本日出題済み」を記録する副作用を持つ
 * （同日2回目以降は必ず `{ alreadyShownToday: true, cards: [] }` を返す）。
 *
 * そのため `EntryRedirect` と `ReviewPage` は必ずこの共有フックを通じて同一の
 * queryKey でアクセスし、React Query のキャッシュを共有する。`staleTime` を
 * `Infinity` にして自動再フェッチを止めることで、`EntryRedirect` が最初に取得した
 * カード一覧を `ReviewPage` がそのまま再利用できるようにしている
 * （そうしないと `ReviewPage` 側の再フェッチで cards が消えてしまう）。
 *
 * ⚠️ 意図した設計上の制約：`staleTime`/`gcTime` を `Infinity` にしているため、
 * このキャッシュは「ページをフルリロードするまで」有効な、実質セッションスコープの
 * 値になる。つまり、SPA を開いたまま日付が変わっても、このキャッシュは自動的には
 * 破棄・再取得されず、前日（JST基準の「昨日」）の出題結果を握ったままになりうる。
 * 現状は `/` と `/review` への遷移導線がログイン直後の自動リダイレクトのみで、
 * ユーザーが後から明示的にこのクエリを再実行する手段（「もう一度復習する」ボタン等）
 * が存在しないため実害はない。将来そうした機能や、日をまたいだ長時間セッションを
 * 想定する画面を追加する場合は、日付が変わったら明示的に
 * `queryClient.invalidateQueries({ queryKey: quizTodayQueryKey })` するなど、
 * このキャッシュを手動で無効化する仕組みを合わせて検討すること。
 */
export function useQuizToday() {
  return useQuery({
    queryKey: quizTodayQueryKey,
    queryFn: getQuizToday,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
