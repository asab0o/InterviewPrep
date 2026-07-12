import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../errors";
import { createGithubRouter } from "./routes";
import type { GithubService } from "./service";

function buildApp(service: GithubService) {
  const app = express();
  app.use(express.json());
  app.use("/api/github", createGithubRouter(service));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });
  return app;
}

function fakeService(overrides: Partial<GithubService> = {}): GithubService {
  return {
    check: vi.fn(async () => ({ path: "problems/two-pointers/125-valid-palindrome.md", exists: false, createdByApp: false })),
    push: vi.fn(async () => ({ path: "problems/two-pointers/125-valid-palindrome.md", commitUrl: "https://github.com/x/y/commit/z", sha: "abc" })),
    ...overrides,
  } as unknown as GithubService;
}

describe("POST /api/github/check", () => {
  it("returns the check result for a valid attemptId", async () => {
    const service = fakeService();
    const response = await request(buildApp(service)).post("/api/github/check").send({ attemptId: 1 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ path: "problems/two-pointers/125-valid-palindrome.md", exists: false, createdByApp: false });
    expect(service.check).toHaveBeenCalledWith(1);
  });

  it("rejects a missing attemptId with 400 VALIDATION_ERROR", async () => {
    const response = await request(buildApp(fakeService())).post("/api/github/check").send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unknown fields", async () => {
    const response = await request(buildApp(fakeService())).post("/api/github/check").send({ attemptId: 1, extra: "nope" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("propagates service errors (e.g. 404 ATTEMPT_NOT_FOUND) through the error handler", async () => {
    const service = fakeService({ check: vi.fn(async () => { throw new ApiError(404, "ATTEMPT_NOT_FOUND", "Attempt not found"); }) });
    const response = await request(buildApp(service)).post("/api/github/check").send({ attemptId: 999 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ATTEMPT_NOT_FOUND");
  });
});

describe("POST /api/github/push", () => {
  it("pushes with default force=false and no content", async () => {
    const service = fakeService();
    const response = await request(buildApp(service)).post("/api/github/push").send({ attemptId: 1 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ path: "problems/two-pointers/125-valid-palindrome.md", commitUrl: "https://github.com/x/y/commit/z", sha: "abc" });
    expect(service.push).toHaveBeenCalledWith(1, undefined, false);
  });

  it("passes content and force through to the service", async () => {
    const service = fakeService();
    await request(buildApp(service)).post("/api/github/push").send({ attemptId: 1, content: "# custom", force: true });

    expect(service.push).toHaveBeenCalledWith(1, "# custom", true);
  });

  it("rejects a missing attemptId with 400 VALIDATION_ERROR", async () => {
    const response = await request(buildApp(fakeService())).post("/api/github/push").send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 FILE_EXISTS when the service reports a conflict", async () => {
    const service = fakeService({ push: vi.fn(async () => { throw new ApiError(409, "FILE_EXISTS", "同一パスのファイルが既に存在します"); }) });
    const response = await request(buildApp(service)).post("/api/github/push").send({ attemptId: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("FILE_EXISTS");
  });

  it("returns 409 FILE_NOT_APP_MANAGED when the service refuses to overwrite a non-app file", async () => {
    const service = fakeService({ push: vi.fn(async () => { throw new ApiError(409, "FILE_NOT_APP_MANAGED", "このパスは既存の管理外ファイルのため上書きできません"); }) });
    const response = await request(buildApp(service)).post("/api/github/push").send({ attemptId: 1, force: true });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("FILE_NOT_APP_MANAGED");
  });

  it("returns 503 GITHUB_UNAVAILABLE when GitHub push is not configured", async () => {
    const service = fakeService({ push: vi.fn(async () => { throw new ApiError(503, "GITHUB_UNAVAILABLE", "GitHub連携が設定されていません"); }) });
    const response = await request(buildApp(service)).post("/api/github/push").send({ attemptId: 1 });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("GITHUB_UNAVAILABLE");
  });
});
