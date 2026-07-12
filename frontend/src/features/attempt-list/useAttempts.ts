import { useQuery } from "@tanstack/react-query";
import { getAttempts } from "../../api/attempts";
import { getCategories } from "../../api/categories";
import { getProblems } from "../../api/problems";
import type { AttemptFilters } from "../../types/api";

export function useAttempts(filters: AttemptFilters) {
  const attempts = useQuery({
    queryKey: ["attempts", filters],
    queryFn: () => getAttempts(filters),
    staleTime: 15_000,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });
  const problems = useQuery({
    queryKey: ["problems", filters.categoryId ?? "all"],
    queryFn: () => getProblems(filters.categoryId),
    staleTime: 5 * 60_000,
  });
  return { attempts, categories, problems };
}
