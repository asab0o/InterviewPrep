import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhraseEditor } from "./PhraseEditor";
import { newAttemptDefaults } from "./defaults";
import type { AttemptFormValues } from "./schema";

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((r) => { resolve = r; });
  return { promise, resolve };
}

function ControlledPhraseEditor() {
  const methods = useForm<AttemptFormValues>({ defaultValues: newAttemptDefaults() });
  const [englishDraft, setEnglishDraft] = useState("");
  return (
    <FormProvider {...methods}>
      <PhraseEditor englishDraft={englishDraft} onEnglishDraftChange={setEnglishDraft} />
    </FormProvider>
  );
}

function renderEditor() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ControlledPhraseEditor />
    </QueryClientProvider>,
  );
}

describe("PhraseEditor", () => {
  it("fills the Japanese suggestion from the translate API and allows manual edits", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ japanese: "境界ケース" }));
    vi.stubGlobal("fetch", fetchMock);
    renderEditor();

    fireEvent.change(screen.getByLabelText("追加する英語フレーズ"), { target: { value: "edge case" } });
    fireEvent.click(screen.getByRole("button", { name: "翻訳" }));

    expect(await screen.findByDisplayValue("境界ケース")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/translate", expect.objectContaining({ method: "POST" }));

    fireEvent.change(screen.getByLabelText("追加する日本語訳"), { target: { value: "手動修正" } });
    expect(screen.getByLabelText("追加する日本語訳")).toHaveValue("手動修正");
  });

  it("shows an error near the phrase inputs when the translate API fails, and the form stays usable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { code: "TRANSLATE_UNAVAILABLE", message: "翻訳サービスが利用できません。" } }, 503)));
    renderEditor();

    fireEvent.change(screen.getByLabelText("追加する英語フレーズ"), { target: { value: "edge case" } });
    fireEvent.click(screen.getByRole("button", { name: "翻訳" }));

    expect(await screen.findByText("翻訳サービスが利用できません。")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("追加する日本語訳"), { target: { value: "境界ケース" } });
    expect(screen.getByRole("button", { name: "フレーズを追加" })).not.toBeDisabled();
  });

  it("clears a stale translate error once the user edits the English input again", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { code: "TRANSLATE_UNAVAILABLE", message: "翻訳サービスが利用できません。" } }, 503)));
    renderEditor();

    fireEvent.change(screen.getByLabelText("追加する英語フレーズ"), { target: { value: "edge case" } });
    fireEvent.click(screen.getByRole("button", { name: "翻訳" }));
    expect(await screen.findByText("翻訳サービスが利用できません。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("追加する英語フレーズ"), { target: { value: "edge case 2" } });
    expect(screen.queryByText("翻訳サービスが利用できません。")).not.toBeInTheDocument();
  });

  it("discards a translate response that arrives after the English input has already changed (race condition)", async () => {
    const first = deferredResponse();
    const fetchMock = vi.fn().mockReturnValueOnce(first.promise);
    vi.stubGlobal("fetch", fetchMock);
    renderEditor();

    fireEvent.change(screen.getByLabelText("追加する英語フレーズ"), { target: { value: "edge case" } });
    fireEvent.click(screen.getByRole("button", { name: "翻訳" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    // user changes their mind and edits the English input before the response arrives
    fireEvent.change(screen.getByLabelText("追加する英語フレーズ"), { target: { value: "a completely different phrase" } });

    // the stale response for "edge case" now resolves
    first.resolve(jsonResponse({ japanese: "境界ケース" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // the Japanese field must NOT be overwritten with a translation of text the user moved away from
    expect(screen.getByLabelText("追加する日本語訳")).toHaveValue("");
    expect(screen.getByLabelText("追加する英語フレーズ")).toHaveValue("a completely different phrase");
  });

  it("applies a translate response when the English input is unchanged when it arrives", async () => {
    const first = deferredResponse();
    const fetchMock = vi.fn().mockReturnValueOnce(first.promise);
    vi.stubGlobal("fetch", fetchMock);
    renderEditor();

    fireEvent.change(screen.getByLabelText("追加する英語フレーズ"), { target: { value: "edge case" } });
    fireEvent.click(screen.getByRole("button", { name: "翻訳" }));

    first.resolve(jsonResponse({ japanese: "境界ケース" }));
    expect(await screen.findByDisplayValue("境界ケース")).toBeInTheDocument();
  });
});
