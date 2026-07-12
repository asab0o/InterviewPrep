import { useQuery } from "@tanstack/react-query";
import { getAttempt } from "../../api/attempts";

export function useAttemptDetail(id: number | null) {
  return useQuery({
    queryKey: ["attempt", id],
    queryFn: () => getAttempt(id!),
    enabled: id !== null,
    retry: false,
    staleTime: 15_000,
  });
}
