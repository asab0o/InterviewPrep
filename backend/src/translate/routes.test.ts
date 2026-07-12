import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTranslateRouter } from "./routes";
import { TranslateService } from "./service";

function buildApp(service: TranslateService) {
  const app = express();
  app.use(express.json());
  app.use("/api/translate", createTranslateRouter(service));
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

describe("POST /api/translate", () => {
  it("returns a Japanese translation for a valid request", async () => {
    const service = new TranslateService(async (english) => `${english}-ja`);
    const app = buildApp(service);

    const response = await request(app).post("/api/translate").send({ english: "edge case" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ japanese: "edge case-ja" });
  });

  it("rejects an empty english field with 400 VALIDATION_ERROR", async () => {
    const service = new TranslateService(async (english) => `${english}-ja`);
    const app = buildApp(service);

    const response = await request(app).post("/api/translate").send({ english: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a missing english field with 400 VALIDATION_ERROR", async () => {
    const service = new TranslateService(async (english) => `${english}-ja`);
    const app = buildApp(service);

    const response = await request(app).post("/api/translate").send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an overly long english field with 400 VALIDATION_ERROR", async () => {
    const service = new TranslateService(async (english) => `${english}-ja`);
    const app = buildApp(service);

    const response = await request(app).post("/api/translate").send({ english: "a".repeat(501) });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unknown fields", async () => {
    const service = new TranslateService(async (english) => `${english}-ja`);
    const app = buildApp(service);

    const response = await request(app).post("/api/translate").send({ english: "edge case", extra: "nope" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 502 TRANSLATE_FAILED when the underlying translation call fails", async () => {
    const service = new TranslateService(async () => {
      throw new Error("network error");
    });
    const app = buildApp(service);

    const response = await request(app).post("/api/translate").send({ english: "edge case" });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("TRANSLATE_FAILED");
  });

  it("returns 503 TRANSLATE_UNAVAILABLE when ANTHROPIC_API_KEY is not configured", async () => {
    const service = new TranslateService(null);
    const app = buildApp(service);

    const response = await request(app).post("/api/translate").send({ english: "edge case" });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("TRANSLATE_UNAVAILABLE");
  });
});
