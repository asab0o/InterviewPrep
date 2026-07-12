import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../errors";
import { createUmpireRouter } from "./routes";
import { UmpireService } from "./service";

function buildApp(service: UmpireService) {
  const app = express();
  app.use(express.json());
  app.use("/api", createUmpireRouter(service));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error && typeof error === "object" && "status" in error && "code" in error) {
      const apiError = error as { status: number; code: string; message: string };
      res.status(apiError.status).json({ error: { code: apiError.code, message: apiError.message } });
      return;
    }
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });
  return app;
}

// ルーティング層（バリデーション・パラメータの受け渡し・エラーハンドリング）のみを検証するため、
// DBに触れないダミーのUmpireServiceを作り、各メソッドをvi.spyOnで差し替える（DB接続は不要）。
function buildService(): UmpireService {
  return new UmpireService(null, {} as never);
}

describe("POST /api/problems/:id/umpire", () => {
  it("returns the generated explanation for a valid request", async () => {
    const service = buildService();
    const generateForProblem = vi.spyOn(service, "generateForProblem").mockResolvedValue({
      umpireExplanation: "explanation",
      cached: false,
      generatedAt: "2026-07-12T00:00:00.000Z",
    });
    const app = buildApp(service);

    const response = await request(app).post("/api/problems/5/umpire").send({ problemStatement: "Two Sum..." });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      umpireExplanation: "explanation",
      cached: false,
      generatedAt: "2026-07-12T00:00:00.000Z",
    });
    expect(generateForProblem).toHaveBeenCalledWith(5, "Two Sum...", false);
  });

  it("passes force=true through to the service", async () => {
    const service = buildService();
    const generateForProblem = vi.spyOn(service, "generateForProblem").mockResolvedValue({
      umpireExplanation: "explanation",
      cached: false,
      generatedAt: "2026-07-12T00:00:00.000Z",
    });
    const app = buildApp(service);

    await request(app).post("/api/problems/5/umpire").send({ problemStatement: "Two Sum...", force: true });

    expect(generateForProblem).toHaveBeenCalledWith(5, "Two Sum...", true);
  });

  it("rejects a non-numeric id with 400 VALIDATION_ERROR", async () => {
    const app = buildApp(buildService());

    const response = await request(app).post("/api/problems/abc/umpire").send({ problemStatement: "text" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an empty problemStatement with 400 VALIDATION_ERROR", async () => {
    const app = buildApp(buildService());

    const response = await request(app).post("/api/problems/5/umpire").send({ problemStatement: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unknown fields with 400 VALIDATION_ERROR", async () => {
    const app = buildApp(buildService());

    const response = await request(app).post("/api/problems/5/umpire").send({ problemStatement: "text", extra: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 PROBLEM_NOT_FOUND when the service reports a missing problem", async () => {
    const service = buildService();
    vi.spyOn(service, "generateForProblem").mockRejectedValue(
      new ApiError(404, "PROBLEM_NOT_FOUND", "Problem not found"),
    );
    const app = buildApp(service);

    const response = await request(app).post("/api/problems/999999/umpire").send({ problemStatement: "text" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PROBLEM_NOT_FOUND");
  });

  it("returns 503 UMPIRE_UNAVAILABLE when ANTHROPIC_API_KEY is not configured", async () => {
    const service = buildService();
    vi.spyOn(service, "generateForProblem").mockRejectedValue(
      new ApiError(503, "UMPIRE_UNAVAILABLE", "UMPIRE explanation generation service is not configured"),
    );
    const app = buildApp(service);

    const response = await request(app).post("/api/problems/5/umpire").send({ problemStatement: "text" });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("UMPIRE_UNAVAILABLE");
  });

  it("returns 502 UMPIRE_FAILED when the underlying generation call fails", async () => {
    const service = buildService();
    vi.spyOn(service, "generateForProblem").mockRejectedValue(
      new ApiError(502, "UMPIRE_FAILED", "Failed to generate UMPIRE explanation"),
    );
    const app = buildApp(service);

    const response = await request(app).post("/api/problems/5/umpire").send({ problemStatement: "text" });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("UMPIRE_FAILED");
  });
});

describe("POST /api/umpire/preview", () => {
  it("returns a generated explanation without persisting it", async () => {
    const service = buildService();
    const preview = vi.spyOn(service, "preview").mockResolvedValue({
      umpireExplanation: "preview explanation",
      generatedAt: "2026-07-12T00:00:00.000Z",
    });
    const app = buildApp(service);

    const response = await request(app).post("/api/umpire/preview").send({ problemStatement: "Custom problem..." });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      umpireExplanation: "preview explanation",
      generatedAt: "2026-07-12T00:00:00.000Z",
    });
    expect(preview).toHaveBeenCalledWith("Custom problem...");
  });

  it("rejects an empty problemStatement with 400 VALIDATION_ERROR", async () => {
    const app = buildApp(buildService());

    const response = await request(app).post("/api/umpire/preview").send({ problemStatement: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a missing problemStatement with 400 VALIDATION_ERROR", async () => {
    const app = buildApp(buildService());

    const response = await request(app).post("/api/umpire/preview").send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a force field (not applicable to preview) with 400 VALIDATION_ERROR", async () => {
    const app = buildApp(buildService());

    const response = await request(app).post("/api/umpire/preview").send({ problemStatement: "text", force: true });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 503 UMPIRE_UNAVAILABLE when ANTHROPIC_API_KEY is not configured", async () => {
    const service = buildService();
    vi.spyOn(service, "preview").mockRejectedValue(
      new ApiError(503, "UMPIRE_UNAVAILABLE", "UMPIRE explanation generation service is not configured"),
    );
    const app = buildApp(service);

    const response = await request(app).post("/api/umpire/preview").send({ problemStatement: "text" });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("UMPIRE_UNAVAILABLE");
  });

  it("returns 502 UMPIRE_FAILED when the underlying generation call fails", async () => {
    const service = buildService();
    vi.spyOn(service, "preview").mockRejectedValue(
      new ApiError(502, "UMPIRE_FAILED", "Failed to generate UMPIRE explanation"),
    );
    const app = buildApp(service);

    const response = await request(app).post("/api/umpire/preview").send({ problemStatement: "text" });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("UMPIRE_FAILED");
  });
});
