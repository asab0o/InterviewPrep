import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttemptFilters } from "../types/api";
import { AttemptListPage } from "./AttemptListPage";

const useAttemptsMock = vi.fn();
vi.mock("../features/attempt-list/useAttempts", () => ({
  useAttempts: (filters: AttemptFilters) => useAttemptsMock(filters),
}));

const query = (data: unknown) => ({ data, isPending: false, isError: false, refetch: vi.fn() });

beforeEach(() => {
  useAttemptsMock.mockReset();
  useAttemptsMock.mockReturnValue({
    attempts: query([
      { id: 3, date: "2026-07-12", attemptNumber: 2, title: "Valid Palindrome", number: 125, categoryName: "Two Pointers", hasVideo: true, githubPushed: false },
      { id: 2, date: "2026-07-10", attemptNumber: 1, title: "Custom Problem", number: null, categoryName: null, hasVideo: false, githubPushed: true },
    ]),
    categories: query([{ id: 2, name: "Two Pointers", slug: "two-pointers", sortOrder: 2 }]),
    problems: query([{ id: 10, categoryId: 2, number: 125, title: "Valid Palindrome", slug: "valid-palindrome", hasUmpireExplanation: false }]),
  });
});

describe("AttemptListPage", () => {
  it("renders attempt metadata and status", () => {
    render(<MemoryRouter><AttemptListPage /></MemoryRouter>);

    expect(screen.getByText("Valid Palindrome")).toBeInTheDocument();
    expect(screen.getByText("Custom Problem")).toBeInTheDocument();
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Valid Palindrome/ })).toHaveAttribute("href", "/attempts/3");
  });

  it("requests filtered data when a category is selected", () => {
    render(<MemoryRouter><AttemptListPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("カテゴリー"), { target: { value: "2" } });

    expect(useAttemptsMock).toHaveBeenLastCalledWith({ categoryId: 2 });
    expect(screen.getByText("絞り込み中")).toBeInTheDocument();
  });

  it("shows a filtered empty state and clears filters", () => {
    useAttemptsMock.mockImplementation((filters: AttemptFilters) => ({
      attempts: query(filters.categoryId ? [] : [{ id: 1, date: "2026-07-01", attemptNumber: 1, title: "Two Sum", number: 1, categoryName: "Arrays and Hashing", hasVideo: false, githubPushed: false }]),
      categories: query([{ id: 2, name: "Two Pointers", slug: "two-pointers", sortOrder: 2 }]),
      problems: query([]),
    }));
    render(<MemoryRouter><AttemptListPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("カテゴリー"), { target: { value: "2" } });

    expect(screen.getByText("条件に一致する記録がありません")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "絞り込みを解除" })[0]!);
    expect(useAttemptsMock).toHaveBeenLastCalledWith({});
  });
});
