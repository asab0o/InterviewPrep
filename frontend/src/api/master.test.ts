import { afterEach, describe, expect, it, vi } from "vitest";
import { getCategories } from "./categories";
import { getProblems } from "./problems";

afterEach(() => vi.unstubAllGlobals());

describe("master APIs", () => {
  it("loads categories and category-filtered problems", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response("[]", { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);

    await getCategories();
    await getProblems(2);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/categories");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/problems?categoryId=2");
  });
});
