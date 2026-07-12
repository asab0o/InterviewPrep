import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { AttemptDetailPage } from "./AttemptDetailPage";

const useAttemptDetailMock = vi.fn();
vi.mock("../features/attempt-detail/useAttemptDetail", () => ({
  useAttemptDetail: (id: number | null) => useAttemptDetailMock(id),
}));

const detail = {
  id: 3, date: "2026-07-12", attemptNumber: 2, problemId: 10, customTitle: null, customNumber: null,
  categoryId: 2, categoryName: "Two Pointers", categorySlug: "two-pointers", title: "Valid Palindrome", number: 125,
  code: "function isPalindrome() { return true; }", problemStatement: "Given a string...", umpireExplanation: "Understand the problem",
  videoUrl: "https://youtu.be/dQw4w9WgXcQ", transcript: "First, I would clarify the input.", retrospective: "Missed an edge case.",
  githubPushed: true, githubPath: "problems/two-pointers/125-valid-palindrome-2.md",
  phrases: [{ id: 1, englishText: "edge case", japaneseText: "境界ケース" }],
  createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z",
};

function renderPage(path = "/attempts/3") {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/attempts/:id" element={<AttemptDetailPage />} /></Routes></MemoryRouter>);
}

beforeEach(() => {
  useAttemptDetailMock.mockReset();
  useAttemptDetailMock.mockReturnValue({ data: detail, isPending: false, isError: false, error: null, refetch: vi.fn() });
});

describe("AttemptDetailPage", () => {
  it("renders the complete attempt and edit link", () => {
    renderPage();

    expect(useAttemptDetailMock).toHaveBeenCalledWith(3);
    expect(screen.getByText("Valid Palindrome")).toBeInTheDocument();
    expect(screen.getByText("function isPalindrome() { return true; }")).toBeInTheDocument();
    expect(screen.getByText("edge case")).toBeInTheDocument();
    expect(screen.getByText("First, I would clarify the input.")).toBeInTheDocument();
    expect(screen.getByTitle("Practice video")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(screen.getByRole("link", { name: "編集する" })).toHaveAttribute("href", "/attempts/3/edit");
  });

  it("shows not found for a 404 response", () => {
    useAttemptDetailMock.mockReturnValue({ data: undefined, isPending: false, isError: true, error: new ApiError(404, "ATTEMPT_NOT_FOUND", "Attempt not found"), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText("記録が見つかりません")).toBeInTheDocument();
  });

  it("does not request an invalid route id", () => {
    renderPage("/attempts/not-a-number");
    expect(useAttemptDetailMock).toHaveBeenCalledWith(null);
    expect(screen.getByText("記録が見つかりません")).toBeInTheDocument();
  });
});
