import { afterEach, describe, expect, it, vi } from "vitest";
import { createAttempt, getAttempt, getAttempts, updateAttempt } from "./attempts";

afterEach(() => vi.unstubAllGlobals());

describe("attempt API", () => {
  it("adds selected filters to the list endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await getAttempts({ categoryId: 2, problemId: 10 });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/attempts?categoryId=2&problemId=10");
  });

  it("calls the detail endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getAttempt(42);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/attempts/42");
  });

  it("posts and puts attempt input", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response("{}", { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const input = { date: "2026-07-12", problemId: 10, phrases: [] };
    await createAttempt(input);
    await updateAttempt(42, input);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/attempts");
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: "POST", body: JSON.stringify(input) }));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/attempts/42");
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: "PUT", body: JSON.stringify(input) }));
  });
});
