import type {
  GenerateUmpireRequest,
  GenerateUmpireResponse,
  PreviewUmpireRequest,
  PreviewUmpireResponse,
} from "../types/api";
import { apiRequest } from "./client";

export const generateProblemUmpire = (problemId: number, input: GenerateUmpireRequest) =>
  apiRequest<GenerateUmpireResponse>(`/api/problems/${problemId}/umpire`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const previewUmpire = (input: PreviewUmpireRequest) =>
  apiRequest<PreviewUmpireResponse>("/api/umpire/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
