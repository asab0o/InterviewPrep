import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getQuizToday } from "../api/quiz";

export function EntryRedirect() {
  const quiz = useQuery({ queryKey: ["quiz", "today"], queryFn: getQuizToday, retry: false });
  if (quiz.isPending) return <p className="text-sm text-slate-600">今日の復習を確認しています…</p>;
  if (quiz.isError) return <Navigate to="/dashboard" replace />;
  const shouldReview = !quiz.data.alreadyShownToday && quiz.data.cards.length > 0;
  return <Navigate to={shouldReview ? "/review" : "/dashboard"} replace />;
}
