import { Navigate } from "react-router-dom";
import { QUIZ_CHECKING_MESSAGE } from "../features/review/messages";
import { useQuizToday } from "../features/review/useQuizToday";

export function EntryRedirect() {
  const quiz = useQuizToday();
  if (quiz.isPending) return <p className="text-sm text-slate-600">{QUIZ_CHECKING_MESSAGE}</p>;
  if (quiz.isError) return <Navigate to="/dashboard" replace />;
  const shouldReview = !quiz.data.alreadyShownToday && quiz.data.cards.length > 0;
  return <Navigate to={shouldReview ? "/review" : "/dashboard"} replace />;
}
