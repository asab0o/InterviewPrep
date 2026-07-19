import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuizCard } from "../types/api";
import { ReviewPage } from "./ReviewPage";

const useQuizTodayMock = vi.fn();
vi.mock("../features/review/useQuizToday", () => ({
  useQuizToday: () => useQuizTodayMock(),
}));

const cards: QuizCard[] = [
  { phraseId: 1, englishText: "binary search", japaneseText: "二分探索" },
  { phraseId: 2, englishText: "sliding window", japaneseText: "スライディングウィンドウ" },
  { phraseId: 3, englishText: "two pointers", japaneseText: "二点法" },
];

function query(data: unknown) {
  return { data, isPending: false, isError: false };
}

function renderReviewPage() {
  return render(
    <MemoryRouter initialEntries={["/review"]}>
      <Routes>
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useQuizTodayMock.mockReset();
  useQuizTodayMock.mockReturnValue(query({ alreadyShownToday: false, cards }));
});

describe("ReviewPage", () => {
  it("shows the Japanese translation first, then reveals English on click", () => {
    renderReviewPage();

    expect(screen.getByText("二分探索")).toBeInTheDocument();
    expect(screen.queryByText("binary search")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /日本語/ }));

    expect(screen.getByText("binary search")).toBeInTheDocument();
    expect(screen.queryByText("二分探索")).not.toBeInTheDocument();
  });

  it("exposes the phrase text itself as the flip button's accessible name (not hidden behind aria-label)", () => {
    renderReviewPage();

    // aria-label でボタンの名前を上書きしていると、フレーズ本文を含む名前では
    // 見つからずこのクエリは失敗する（スクリーンリーダー利用者に本文が読まれない回帰の防止）。
    const front = screen.getByRole("button", { name: /二分探索/ });
    expect(front).toBeInTheDocument();

    fireEvent.click(front);

    const back = screen.getByRole("button", { name: /binary search/ });
    expect(back).toBeInTheDocument();
  });

  it("advances to the next card and resets the flip state to Japanese-first", () => {
    renderReviewPage();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /日本語/ }));
    expect(screen.getByText("binary search")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("スライディングウィンドウ")).toBeInTheDocument();
    expect(screen.queryByText("sliding window")).not.toBeInTheDocument();
  });

  it("navigates to the dashboard after the last card without showing a completion message", () => {
    renderReviewPage();

    fireEvent.click(screen.getByRole("button", { name: "次へ" })); // 1 -> 2
    fireEvent.click(screen.getByRole("button", { name: "次へ" })); // 2 -> 3
    fireEvent.click(screen.getByRole("button", { name: "次へ" })); // 3 -> dashboard

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
    expect(screen.queryByText(/お疲れ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/完了/)).not.toBeInTheDocument();
  });

  it("navigates to the dashboard when the close button is clicked mid-review", () => {
    renderReviewPage();

    fireEvent.click(screen.getByRole("button", { name: /日本語/ }));
    fireEvent.click(screen.getByRole("button", { name: "復習を閉じてダッシュボードへ戻る" }));

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("redirects to the dashboard when there are no cards to review (direct access defense)", () => {
    useQuizTodayMock.mockReturnValue(query({ alreadyShownToday: false, cards: [] }));
    renderReviewPage();

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("redirects to the dashboard when already shown today (direct access after review)", () => {
    useQuizTodayMock.mockReturnValue(query({ alreadyShownToday: true, cards: [] }));
    renderReviewPage();

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("redirects to the dashboard when the request fails", () => {
    useQuizTodayMock.mockReturnValue({ data: undefined, isPending: false, isError: true });
    renderReviewPage();

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("navigates straight to the dashboard after the only card when the stock has fewer than 3 phrases", () => {
    const singleCard: QuizCard[] = [{ phraseId: 9, englishText: "greedy", japaneseText: "貪欲法" }];
    useQuizTodayMock.mockReturnValue(query({ alreadyShownToday: false, cards: singleCard }));
    renderReviewPage();

    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.getByText("貪欲法")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
    expect(screen.queryByText(/お疲れ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/完了/)).not.toBeInTheDocument();
  });
});
