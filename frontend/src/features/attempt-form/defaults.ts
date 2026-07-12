import type { AttemptDetail } from "../../types/api";
import type { AttemptFormValues } from "./schema";

function localToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function newAttemptDefaults(): AttemptFormValues {
  return {
    date: localToday(), categoryId: null, problemMode: "master", problemId: null,
    customTitle: "", customNumber: null, code: "", problemStatement: "", videoUrl: "",
    transcript: "", retrospective: "", umpireExplanation: "", phrases: [],
  };
}

export function editAttemptDefaults(attempt: AttemptDetail): AttemptFormValues {
  return {
    date: attempt.date,
    categoryId: attempt.categoryId,
    problemMode: attempt.problemId === null ? "custom" : "master",
    problemId: attempt.problemId,
    customTitle: attempt.customTitle ?? "",
    customNumber: attempt.customNumber,
    code: attempt.code ?? "",
    problemStatement: attempt.problemStatement ?? "",
    videoUrl: attempt.videoUrl ?? "",
    transcript: attempt.transcript ?? "",
    retrospective: attempt.retrospective ?? "",
    umpireExplanation: attempt.umpireExplanation ?? "",
    phrases: attempt.phrases,
  };
}
