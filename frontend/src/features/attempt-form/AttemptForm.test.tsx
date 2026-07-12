import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttemptForm } from "./AttemptForm";
import { editAttemptDefaults, newAttemptDefaults } from "./defaults";

const categories = [{ id: 2, name: "Two Pointers", slug: "two-pointers", sortOrder: 2 }];
const problems = [
  { id: 10, categoryId: 2, number: 125, title: "Valid Palindrome", slug: "valid-palindrome", hasUmpireExplanation: false },
  { id: 11, categoryId: 2, number: 11, title: "Container With Most Water", slug: "container-with-most-water", hasUmpireExplanation: false },
];

afterEach(() => vi.unstubAllGlobals());

function renderForm(onSubmit = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AttemptForm categories={categories} problems={problems} initialValues={newAttemptDefaults()} isEditing={false} isSaving={false} serverError={null} onSubmit={onSubmit} />
    </QueryClientProvider>,
  );
  return onSubmit;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("AttemptForm", () => {
  it("submits a master problem with a newly added phrase", async () => {
    const onSubmit = renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/^問題 \*/), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("追加する英語フレーズ"), { target: { value: "edge case" } });
    fireEvent.change(screen.getByLabelText("追加する日本語訳"), { target: { value: "境界ケース" } });
    fireEvent.click(screen.getByRole("button", { name: "フレーズを追加" }));
    fireEvent.click(screen.getByRole("button", { name: "記録を保存" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      problemId: 10,
      categoryId: null,
      phrases: [{ id: undefined, englishText: "edge case", japaneseText: "境界ケース" }],
    })));
  });

  it("requires a title for a custom problem", async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("マスタ外"));
    fireEvent.click(screen.getByRole("button", { name: "記録を保存" }));

    expect(await screen.findByText("問題名を入力してください。")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps phrase ids and custom explanation in edit defaults", () => {
    const values = editAttemptDefaults({
      id: 1, date: "2026-07-12", attemptNumber: 1, problemId: null, customTitle: "Custom", customNumber: 999,
      categoryId: 2, categoryName: "Two Pointers", categorySlug: "two-pointers", title: "Custom", number: 999,
      code: null, problemStatement: null, umpireExplanation: "Saved explanation", videoUrl: null, transcript: null,
      retrospective: null, githubPushed: false, githubPath: null,
      phrases: [{ id: 7, englishText: "hello", japaneseText: "こんにちは" }],
      createdAt: "2026-07-12T00:00:00Z", updatedAt: "2026-07-12T00:00:00Z",
    });
    expect(values).toEqual(expect.objectContaining({
      problemMode: "custom",
      umpireExplanation: "Saved explanation",
      phrases: [{ id: 7, englishText: "hello", japaneseText: "こんにちは" }],
    }));
  });

  // Regression test for a react-hook-form + zod pitfall found during review (see the
  // `numberOrNull` comment in ProblemAutocomplete.tsx): a custom-mode submission never touches
  // the hidden master `problemId` <select>, which is exactly the common path real users take.
  it("submits a custom-mode attempt without ever touching the (hidden) master problem select", async () => {
    const onSubmit = renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("マスタ外"));
    fireEvent.change(screen.getByLabelText(/^問題名/), { target: { value: "Design Twitter" } });
    fireEvent.click(screen.getByRole("button", { name: "記録を保存" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      problemId: null,
      customTitle: "Design Twitter",
      categoryId: 2,
    })));
  });

  it("generates a UMPIRE preview for a custom problem and stores it on the form", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ umpireExplanation: "U: understand the problem...", generatedAt: "2026-07-12T00:00:00Z" }));
    vi.stubGlobal("fetch", fetchMock);
    const onSubmit = renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("マスタ外"));
    fireEvent.change(screen.getByLabelText(/^問題名/), { target: { value: "Design Twitter" } });
    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Design Twitter\nSome body text" } });
    fireEvent.click(screen.getByRole("button", { name: "UMPIRE解説を生成" }));

    expect(await screen.findByText("U: understand the problem...")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/umpire/preview", expect.objectContaining({ method: "POST" }));
    expect(screen.queryByRole("button", { name: "再生成" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "記録を保存" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ umpireExplanation: "U: understand the problem..." })));
  });

  it("generates UMPIRE for a master problem without duplicating it into the attempt payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ umpireExplanation: "U: master explanation", cached: false, generatedAt: "2026-07-12T00:00:00Z" }));
    vi.stubGlobal("fetch", fetchMock);
    const onSubmit = renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/^問題 \*/), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Valid Palindrome\nGiven a string..." } });
    fireEvent.click(screen.getByRole("button", { name: "UMPIRE解説を生成" }));

    expect(await screen.findByText("U: master explanation")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/problems/10/umpire", expect.objectContaining({ method: "POST" }));

    fireEvent.click(screen.getByRole("button", { name: "記録を保存" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ umpireExplanation: null })));
  });

  it("shows the cached badge when the server returns a cached explanation, and clears it on force regenerate", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ umpireExplanation: "U: cached explanation", cached: true, generatedAt: "2026-07-12T00:00:00Z" }))
      .mockResolvedValueOnce(jsonResponse({ umpireExplanation: "U: freshly regenerated", cached: false, generatedAt: "2026-07-12T00:05:00Z" }));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/^問題 \*/), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Valid Palindrome\nGiven a string..." } });
    fireEvent.click(screen.getByRole("button", { name: "UMPIRE解説を生成" }));

    expect(await screen.findByText("U: cached explanation")).toBeInTheDocument();
    expect(screen.getByText("保存済みの解説を再利用しました")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/problems/10/umpire", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ problemStatement: "Valid Palindrome\nGiven a string...", force: false }),
    }));

    fireEvent.click(screen.getByRole("button", { name: "再生成" }));

    expect(await screen.findByText("U: freshly regenerated")).toBeInTheDocument();
    expect(screen.queryByText("保存済みの解説を再利用しました")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/problems/10/umpire", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ problemStatement: "Valid Palindrome\nGiven a string...", force: true }),
    }));
  });

  it("shows a panel error when UMPIRE generation fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { code: "UMPIRE_UNAVAILABLE", message: "UMPIRE生成が利用できません。" } }, 503)));
    renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("マスタ外"));
    fireEvent.change(screen.getByLabelText(/^問題名/), { target: { value: "Design Twitter" } });
    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Design Twitter\nSome body" } });
    fireEvent.click(screen.getByRole("button", { name: "UMPIRE解説を生成" }));

    expect(await screen.findByText("UMPIRE生成が利用できません。")).toBeInTheDocument();
  });

  it("clears a stale UMPIRE generation error once the problem statement is edited again", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { code: "UMPIRE_UNAVAILABLE", message: "UMPIRE生成が利用できません。" } }, 503)));
    renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("マスタ外"));
    fireEvent.change(screen.getByLabelText(/^問題名/), { target: { value: "Design Twitter" } });
    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Design Twitter\nSome body" } });
    fireEvent.click(screen.getByRole("button", { name: "UMPIRE解説を生成" }));
    expect(await screen.findByText("UMPIRE生成が利用できません。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Design Twitter\nEdited body" } });
    await waitFor(() => expect(screen.queryByText("UMPIRE生成が利用できません。")).not.toBeInTheDocument());
  });

  it("adds selected UMPIRE explanation text to the phrases English input", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ umpireExplanation: "Selectable explanation text", generatedAt: "2026-07-12T00:00:00Z" }));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("マスタ外"));
    fireEvent.change(screen.getByLabelText(/^問題名/), { target: { value: "Design Twitter" } });
    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Design Twitter\nSome body" } });
    fireEvent.click(screen.getByRole("button", { name: "UMPIRE解説を生成" }));

    const panel = await screen.findByText("Selectable explanation text");
    const range = document.createRange();
    range.selectNodeContents(panel);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.click(await screen.findByRole("button", { name: "Add to phrases" }));
    expect(screen.getByLabelText("追加する英語フレーズ")).toHaveValue("Selectable explanation text");
  });

  it("auto-fills the problem statement's first line from the title, preserving the body", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("マスタ外"));
    fireEvent.change(screen.getByLabelText(/^問題名/), { target: { value: "Design Twitter" } });

    await waitFor(() => expect(screen.getByLabelText("問題文")).toHaveValue("Design Twitter"));

    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Design Twitter\nBody text line" } });
    fireEvent.change(screen.getByLabelText(/^問題名/), { target: { value: "Design Twitter v2" } });

    await waitFor(() => expect(screen.getByLabelText("問題文")).toHaveValue("Design Twitter v2\nBody text line"));
  });

  it("clears a stale UMPIRE explanation when switching from one master problem to another", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ umpireExplanation: "Explanation for Valid Palindrome", cached: false, generatedAt: "2026-07-12T00:00:00Z" }));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/^問題 \*/), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Valid Palindrome\nGiven a string..." } });
    fireEvent.click(screen.getByRole("button", { name: "UMPIRE解説を生成" }));
    expect(await screen.findByText("Explanation for Valid Palindrome")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^問題 \*/), { target: { value: "11" } });

    expect(screen.queryByText("Explanation for Valid Palindrome")).not.toBeInTheDocument();
    // panel is gone entirely (no umpireText) so nothing can be selected into "Add to phrases"
    expect(screen.queryByRole("button", { name: "Add to phrases" })).not.toBeInTheDocument();
  });

  it("clears a stale UMPIRE explanation when switching from master mode to custom mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ umpireExplanation: "Explanation for Valid Palindrome", cached: false, generatedAt: "2026-07-12T00:00:00Z" }));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    fireEvent.change(screen.getByLabelText(/カテゴリー/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/^問題 \*/), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("問題文"), { target: { value: "Valid Palindrome\nGiven a string..." } });
    fireEvent.click(screen.getByRole("button", { name: "UMPIRE解説を生成" }));
    expect(await screen.findByText("Explanation for Valid Palindrome")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("マスタ外"));

    expect(screen.queryByText("Explanation for Valid Palindrome")).not.toBeInTheDocument();
  });
});
