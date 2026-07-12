import type { AttemptFilters, AttemptListItem } from "../types/api";
import { apiRequest } from "./client";

export const getAttempts = (filters: AttemptFilters) => {
  const params = new URLSearchParams();
  if (filters.categoryId !== undefined) params.set("categoryId", String(filters.categoryId));
  if (filters.problemId !== undefined) params.set("problemId", String(filters.problemId));
  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<AttemptListItem[]>(`/api/attempts${query}`);
};
