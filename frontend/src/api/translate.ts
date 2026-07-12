import type { TranslateRequest, TranslateResponse } from "../types/api";
import { apiRequest } from "./client";

export const translatePhrase = (input: TranslateRequest) =>
  apiRequest<TranslateResponse>("/api/translate", {
    method: "POST",
    body: JSON.stringify(input),
  });
