import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFileText } from "./useFileText";

describe("useFileText", () => {
  it("reads a txt file in the browser", async () => {
    const onRead = vi.fn();
    const { result } = renderHook(() => useFileText(onRead));
    const file = { name: "transcript.txt", text: vi.fn().mockResolvedValue("spoken text") } as unknown as File;
    await act(() => result.current.readFile(file));
    expect(onRead).toHaveBeenCalledWith("spoken text");
    expect(result.current.error).toBeNull();
  });

  it("rejects files other than txt", async () => {
    const { result } = renderHook(() => useFileText(vi.fn()));
    await act(() => result.current.readFile({ name: "video.mp4" } as File));
    expect(result.current.error).toBe(".txtファイルを選択してください。");
  });
});
