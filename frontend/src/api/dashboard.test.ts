import { afterEach, describe, expect, it, vi } from "vitest";
import { getCoverage, getTrend } from "./dashboard";

afterEach(() => vi.unstubAllGlobals());

describe("dashboard API", () => {
  it("calls the coverage and selected trend endpoints", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("[]", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ granularity: "monthly", points: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await getCoverage();
    await getTrend("monthly");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/dashboard/coverage");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/dashboard/trend?granularity=monthly");
  });
});
