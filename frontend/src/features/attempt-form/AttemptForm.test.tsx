import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttemptForm } from "./AttemptForm";
import { editAttemptDefaults, newAttemptDefaults } from "./defaults";

const categories = [{ id: 2, name: "Two Pointers", slug: "two-pointers", sortOrder: 2 }];
const problems = [{ id: 10, categoryId: 2, number: 125, title: "Valid Palindrome", slug: "valid-palindrome", hasUmpireExplanation: false }];

describe("AttemptForm", () => {
  it("submits a master problem with a newly added phrase", async () => {
    const onSubmit = vi.fn();
    render(<AttemptForm categories={categories} problems={problems} initialValues={newAttemptDefaults()} isEditing={false} isSaving={false} serverError={null} onSubmit={onSubmit} />);

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
    const onSubmit = vi.fn();
    render(<AttemptForm categories={categories} problems={problems} initialValues={newAttemptDefaults()} isEditing={false} isSaving={false} serverError={null} onSubmit={onSubmit} />);
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
});
