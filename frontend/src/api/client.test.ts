import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("uses relative paths and includes credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ ok: boolean }>("/api/example")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/example", expect.objectContaining({ credentials: "include" }));
  });

  it("converts API error responses into ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "UNAUTHENTICATED", message: "Login required" },
    }), { status: 401 })));

    await expect(apiRequest("/auth/me")).rejects.toEqual(expect.objectContaining({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Login required",
    }));
  });
});
