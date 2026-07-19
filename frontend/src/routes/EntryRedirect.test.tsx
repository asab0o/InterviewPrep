import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntryRedirect } from "./EntryRedirect";

const useQuizTodayMock = vi.fn();
vi.mock("../features/review/useQuizToday", () => ({
  useQuizToday: () => useQuizTodayMock(),
}));

function renderEntry() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<EntryRedirect />} />
        <Route path="/review" element={<p>Review page</p>} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => useQuizTodayMock.mockReset());

describe("EntryRedirect", () => {
  it("redirects to /review when there is an unseen quiz for today", () => {
    useQuizTodayMock.mockReturnValue({
      data: { alreadyShownToday: false, cards: [{ phraseId: 1, englishText: "a", japaneseText: "あ" }] },
      isPending: false,
      isError: false,
    });
    renderEntry();
    expect(screen.getByText("Review page")).toBeInTheDocument();
  });

  it("redirects to /dashboard when the quiz was already shown today", () => {
    useQuizTodayMock.mockReturnValue({
      data: { alreadyShownToday: true, cards: [] },
      isPending: false,
      isError: false,
    });
    renderEntry();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("redirects to /dashboard when there is no phrase stock", () => {
    useQuizTodayMock.mockReturnValue({
      data: { alreadyShownToday: false, cards: [] },
      isPending: false,
      isError: false,
    });
    renderEntry();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("redirects to /dashboard on error", () => {
    useQuizTodayMock.mockReturnValue({ data: undefined, isPending: false, isError: true });
    renderEntry();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });
});
