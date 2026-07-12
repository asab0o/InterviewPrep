import type { Problem } from "../types/api";
import { apiRequest } from "./client";

export const getProblems = (categoryId?: number) => {
  const query = categoryId === undefined ? "" : `?categoryId=${categoryId}`;
  return apiRequest<Problem[]>(`/api/problems${query}`);
};
