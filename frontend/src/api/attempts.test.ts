import { afterEach, describe, expect, it, vi } from "vitest";
import { getAttempts } from "./attempts";

afterEach(() => vi.unstubAllGlobals());

describe("attempt API", () => {
  it("adds selected filters to the list endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await getAttempts({ categoryId: 2, problemId: 10 });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/attempts?categoryId=2&problemId=10");
  });
});
