import type { AttemptDetail, AttemptFilters, AttemptInput, AttemptListItem } from "../types/api";
import { apiRequest } from "./client";

export const getAttempts = (filters: AttemptFilters) => {
  const params = new URLSearchParams();
  if (filters.categoryId !== undefined) params.set("categoryId", String(filters.categoryId));
  if (filters.problemId !== undefined) params.set("problemId", String(filters.problemId));
  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<AttemptListItem[]>(`/api/attempts${query}`);
};

export const getAttempt = (id: number) => apiRequest<AttemptDetail>(`/api/attempts/${id}`);
export const createAttempt = (input: AttemptInput) => apiRequest<AttemptDetail>("/api/attempts", {
  method: "POST",
  body: JSON.stringify(input),
});
export const updateAttempt = (id: number, input: AttemptInput) => apiRequest<AttemptDetail>(`/api/attempts/${id}`, {
  method: "PUT",
  body: JSON.stringify(input),
});
