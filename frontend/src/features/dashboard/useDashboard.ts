import { useQuery } from "@tanstack/react-query";
import { getCoverage, getTrend } from "../../api/dashboard";
import type { TrendGranularity } from "../../types/api";

export function useDashboard(granularity: TrendGranularity) {
  const coverage = useQuery({
    queryKey: ["dashboard", "coverage"],
    queryFn: getCoverage,
    staleTime: 30_000,
  });
  const trend = useQuery({
    queryKey: ["dashboard", "trend", granularity],
    queryFn: () => getTrend(granularity),
    staleTime: 30_000,
  });
  return { coverage, trend };
}
