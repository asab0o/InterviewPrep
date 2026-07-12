import type { CoverageRow, TrendGranularity, TrendResponse } from "../types/api";
import { apiRequest } from "./client";

export const getCoverage = () => apiRequest<CoverageRow[]>("/api/dashboard/coverage");
export const getTrend = (granularity: TrendGranularity) =>
  apiRequest<TrendResponse>(`/api/dashboard/trend?granularity=${granularity}`);
