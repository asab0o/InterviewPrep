import { describe, expect, it } from "vitest";
import { getSafeHttpUrl, getYouTubeVideoId } from "./youtube";

describe("getYouTubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=3", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("extracts an id from %s", (url, expected) => expect(getYouTubeVideoId(url)).toBe(expected));

  it("rejects non-YouTube URLs and malformed ids", () => {
    expect(getYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(getYouTubeVideoId("https://youtube.com/watch?v=short")).toBeNull();
  });

  it("only allows HTTP(S) external links", () => {
    expect(getSafeHttpUrl("https://example.com/video")).toBe("https://example.com/video");
    expect(getSafeHttpUrl("javascript:alert(1)")).toBeNull();
  });
});
