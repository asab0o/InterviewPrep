import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttemptDetail } from "../../types/api";
import { PushButton } from "./PushButton";

afterEach(() => vi.unstubAllGlobals());

const attempt: AttemptDetail = {
  id: 3,
  date: "2026-07-12",
  attemptNumber: 1,
  problemId: 10,
  customTitle: null,
  customNumber: null,
  categoryId: 2,
  categoryName: "Two Pointers",
  categorySlug: "two-pointers",
  title: "Valid Palindrome",
  number: 125,
  code: "function isPalindrome() { return true; }",
  problemStatement: "Given a string...",
  umpireExplanation: "Understand the problem",
  videoUrl: null,
  transcript: null,
  retrospective: "Missed an edge case.",
  githubPushed: false,
  githubPath: null,
  phrases: [{ id: 1, englishText: "edge case", japaneseText: "境界ケース" }],
  createdAt: "2026-07-12T00:00:00.000Z",
  updatedAt: "2026-07-12T00:00:00.000Z",
};

const expectedMarkdown =
  "# 125. Valid Palindrome (Attempt 1) — 2026-07-12\n\n" +
  "## Code\n\n```\nfunction isPalindrome() { return true; }\n```\n\n" +
  "## English\n- edge case → 境界ケース\n\n" +
  "## Could Not Do\nMissed an edge case.\n";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function renderButton(attemptOverride: AttemptDetail = attempt, queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PushButton attempt={attemptOverride} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("PushButton", () => {
  it("checks, shows a preview, pushes without content/force, and invalidates caches on success", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", exists: false, createdByApp: false }))
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", commitUrl: "https://github.com/x/y/commit/abc", sha: "abc" }));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = renderButton();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByRole("button", { name: "GitHubへpush" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("problems/two-pointers/125-valid-palindrome.md")).toBeInTheDocument();
    expect(screen.getByLabelText(/Markdownプレビュー/)).toHaveValue(expectedMarkdown);

    fireEvent.click(screen.getByRole("button", { name: "pushする" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/github/push");
    const pushBody = JSON.parse((fetchMock.mock.calls[1]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(pushBody).toEqual({ attemptId: 3 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["attempt", 3] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["attempts"] });
    expect(await screen.findByText("problems/two-pointers/125-valid-palindrome.md")).toBeInTheDocument();
  });

  it("includes edited content in the push request only when the preview textarea was edited", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", exists: false, createdByApp: false }))
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", commitUrl: "https://github.com/x/y/commit/abc", sha: "abc" }));
    vi.stubGlobal("fetch", fetchMock);
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "GitHubへpush" }));
    const textarea = await screen.findByLabelText(/Markdownプレビュー/);
    fireEvent.change(textarea, { target: { value: "# edited content" } });
    fireEvent.click(screen.getByRole("button", { name: "pushする" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const pushBody = JSON.parse((fetchMock.mock.calls[1]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(pushBody).toEqual({ attemptId: 3, content: "# edited content" });
  });

  it("shows an overwrite warning and force-pushes on confirmation when the file already exists and is app-managed", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", exists: true, createdByApp: true }))
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", commitUrl: "https://github.com/x/y/commit/def", sha: "def" }));
    vi.stubGlobal("fetch", fetchMock);
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "GitHubへpush" }));
    expect(await screen.findByText("同名ファイルが既に存在します。上書きしますか？")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "上書きしてpushする" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const pushBody = JSON.parse((fetchMock.mock.calls[1]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(pushBody).toEqual({ attemptId: 3, force: true });
  });

  it("blocks pushing to a non-app-managed existing file and never calls the push endpoint", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", exists: true, createdByApp: false }));
    vi.stubGlobal("fetch", fetchMock);
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "GitHubへpush" }));
    expect(await screen.findByText("このファイルはアプリ管理外のため上書きできません。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "pushする" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "上書きしてpushする" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the server's Japanese message and an edit link when a master-less attempt is missing a required field", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ error: { code: "NUMBER_REQUIRED", message: "マスタ外問題は問題番号を設定してからpushしてください" } }, 400));
    vi.stubGlobal("fetch", fetchMock);
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "GitHubへpush" }));

    expect(await screen.findByText("マスタ外問題は問題番号を設定してからpushしてください")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "編集画面で設定してください" })).toHaveAttribute("href", "/attempts/3/edit");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a push error inside the dialog without closing it", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", exists: false, createdByApp: false }))
      .mockResolvedValueOnce(jsonResponse({ error: { code: "GITHUB_UNAVAILABLE", message: "GitHub連携が利用できません。" } }, 503));
    vi.stubGlobal("fetch", fetchMock);
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "GitHubへpush" }));
    fireEvent.click(await screen.findByRole("button", { name: "pushする" }));

    expect(await screen.findByText("GitHub連携が利用できません。")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the dialog when Escape is pressed", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", exists: false, createdByApp: false }));
    vi.stubGlobal("fetch", fetchMock);
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "GitHubへpush" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("labels the button as an update when the attempt was already pushed", () => {
    renderButton({ ...attempt, githubPushed: true });
    expect(screen.getByRole("button", { name: "GitHubを更新" })).toBeInTheDocument();
  });

  // Regression test for code review High 1: a push in flight must not be closeable via any of
  // Escape / overlay click / the ✕ button, and the main button must stay disabled, otherwise the
  // user could close the dialog and re-trigger the flow while the original push request is still
  // pending (double push).
  it("does not close the dialog via Escape, overlay click, or the close button while a push is in flight, and keeps the main button disabled", async () => {
    let resolvePush!: (response: Response) => void;
    const pendingPush = new Promise<Response>((resolve) => { resolvePush = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", exists: false, createdByApp: false }))
      .mockImplementationOnce(() => pendingPush);
    vi.stubGlobal("fetch", fetchMock);
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: "GitHubへpush" }));
    fireEvent.click(await screen.findByRole("button", { name: "pushする" }));

    expect(await screen.findByRole("button", { name: "push中…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GitHubへpush" })).toBeDisabled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const overlay = screen.getByRole("dialog").parentElement;
    if (!overlay) throw new Error("overlay element not found");
    fireEvent.click(overlay);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ダイアログを閉じる" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolvePush(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", commitUrl: "https://github.com/x/y/commit/abc", sha: "abc" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "GitHubへpush" })).not.toBeDisabled();
  });

  // Regression test for code review High 2: AttemptDetailPage renders <PushButton key={data.id} .../>
  // so that switching between attempts (route param change without a full remount) discards stale
  // success/error state instead of showing e.g. a previous attempt's commit URL on the new attempt.
  it("does not leak success state across attempts when remounted via a key change (simulates route param navigation)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", exists: false, createdByApp: false }))
      .mockResolvedValueOnce(jsonResponse({ path: "problems/two-pointers/125-valid-palindrome.md", commitUrl: "https://github.com/x/y/commit/abc", sha: "abc" }));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PushButton key={attempt.id} attempt={attempt} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "GitHubへpush" }));
    fireEvent.click(await screen.findByRole("button", { name: "pushする" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("problems/two-pointers/125-valid-palindrome.md")).toBeInTheDocument();

    const nextAttempt: AttemptDetail = { ...attempt, id: 4, githubPushed: false, githubPath: null };
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PushButton key={nextAttempt.id} attempt={nextAttempt} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByText("problems/two-pointers/125-valid-palindrome.md")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GitHubへpush" })).toBeInTheDocument();
  });
});
