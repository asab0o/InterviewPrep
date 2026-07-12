import type { QuizTodayResponse } from "../types/api";
import { apiRequest } from "./client";

export const getQuizToday = () => apiRequest<QuizTodayResponse>("/api/quiz/today");
