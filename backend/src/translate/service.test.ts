import { describe, expect, it } from "vitest";
import { ApiError } from "../errors";
import { TranslateService } from "./service";

describe("TranslateService", () => {
  it("returns the translated text from the injected translate function", async () => {
    const service = new TranslateService(async (english) => `${english}-ja`);

    await expect(service.translate("edge case")).resolves.toEqual({ japanese: "edge case-ja" });
  });

  it("returns 503 when no translate function is configured (ANTHROPIC_API_KEY unset)", async () => {
    const service = new TranslateService(null);

    await expect(service.translate("edge case")).rejects.toMatchObject({
      status: 503,
      code: "TRANSLATE_UNAVAILABLE",
    });
  });

  it("wraps translate function failures as a 502 without leaking internal details", async () => {
    const service = new TranslateService(async () => {
      throw new Error("anthropic said no (internal detail: api key xyz)");
    });

    const error = await service.translate("edge case").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "TRANSLATE_FAILED" });
    expect((error as ApiError).message).not.toContain("api key");
  });

  it("propagates an ApiError thrown by the translate function unchanged", async () => {
    const service = new TranslateService(async () => {
      throw new ApiError(429, "RATE_LIMITED", "Too many requests");
    });

    await expect(service.translate("edge case")).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
    });
  });
});
