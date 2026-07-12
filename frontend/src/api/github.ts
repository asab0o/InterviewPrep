import type { GithubCheckRequest, GithubCheckResponse, GithubPushRequest, GithubPushResponse } from "../types/api";
import { apiRequest } from "./client";

export const checkGithubPush = (attemptId: number) =>
  apiRequest<GithubCheckResponse>("/api/github/check", {
    method: "POST",
    body: JSON.stringify({ attemptId } satisfies GithubCheckRequest),
  });

export const pushToGithub = (input: GithubPushRequest) =>
  apiRequest<GithubPushResponse>("/api/github/push", {
    method: "POST",
    body: JSON.stringify(input),
  });
