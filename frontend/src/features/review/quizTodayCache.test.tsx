import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryRedirect } from "../../routes/EntryRedirect";
import { ReviewPage } from "../../routes/ReviewPage";

afterEach(() => vi.unstubAllGlobals());

const quizResponse = {
  alreadyShownToday: false,
  cards: [
    { phraseId: 1, englishText: "binary search", japaneseText: "二分探索" },
    { phraseId: 2, englishText: "sliding window", japaneseText: "スライディングウィンドウ" },
    { phraseId: 3, englishText: "two pointers", japaneseText: "二点法" },
  ],
};

/**
 * GET /api/quiz/today はサーバー側で副作用を持ち、同日2回目以降のリクエストは
 * 必ず { alreadyShownToday: true, cards: [] } を返す。
 * EntryRedirect -> ReviewPage の遷移で useQuizToday が再フェッチしてしまうと、
 * ReviewPage 側でカードが消えてしまう回帰を防ぐためのテスト。
 */
describe("quiz/today cache sharing between EntryRedirect and ReviewPage", () => {
  it("fetches quiz/today only once and ReviewPage still shows the cards from EntryRedirect", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(quizResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<EntryRedirect />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/dashboard" element={<p>Dashboard page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("二分探索")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
