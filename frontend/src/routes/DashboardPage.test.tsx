import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoverageRow, TrendGranularity } from "../types/api";
import { DashboardPage } from "./DashboardPage";

const useDashboardMock = vi.fn();
vi.mock("../features/dashboard/useDashboard", () => ({
  useDashboard: (granularity: TrendGranularity) => useDashboardMock(granularity),
}));

const coverage: CoverageRow[] = [
  { categoryId: 1, categoryName: "Arrays and Hashing", masterTotal: 9, uniqueSolved: 3, coverageRate: 1 / 3, totalAttempts: 5 },
  { categoryId: 2, categoryName: "Two Pointers", masterTotal: 5, uniqueSolved: 2, coverageRate: 0.4, totalAttempts: 4 },
];

function query(data: unknown) {
  return { data, isPending: false, isError: false, refetch: vi.fn() };
}

beforeEach(() => {
  useDashboardMock.mockReset();
  useDashboardMock.mockImplementation((granularity: TrendGranularity) => ({
    coverage: query(coverage),
    trend: query({ granularity, points: [{ period: granularity === "weekly" ? "2026-W27" : "2026-07", attemptCount: 3 }] }),
  }));
});

describe("DashboardPage", () => {
  it("shows totals and category progress from API data", () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByText("5 / 14")).toBeInTheDocument();
    expect(screen.getByText("36%")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Two Pointers coverage" })).toHaveAttribute("aria-valuenow", "40");
  });

  it("requests monthly trend data when the period changes", () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "月次" }));

    expect(useDashboardMock).toHaveBeenLastCalledWith("monthly");
    expect(screen.getByText("2026/07")).toBeInTheDocument();
  });

  it("shows a retry action when loading fails", () => {
    useDashboardMock.mockReturnValue({
      coverage: { ...query(undefined), isError: true },
      trend: query(undefined),
    });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByRole("alert")).toHaveTextContent("ダッシュボードを読み込めませんでした");
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
  });
});
