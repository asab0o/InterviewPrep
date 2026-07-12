import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { UmpirePanel } from "./UmpirePanel";
import { newAttemptDefaults } from "./defaults";
import type { AttemptFormValues } from "./schema";

function Harness(props: Parameters<typeof UmpirePanel>[0]) {
  const methods = useForm<AttemptFormValues>({ defaultValues: newAttemptDefaults() });
  return (
    <FormProvider {...methods}>
      <UmpirePanel {...props} />
    </FormProvider>
  );
}

const baseProps = {
  isGenerating: false,
  generateError: null,
  generateDisabled: false,
  umpireText: null,
  umpireCached: null,
  onGenerate: vi.fn(),
  onAddPhrase: vi.fn(),
};

describe("UmpirePanel", () => {
  it("only shows the regenerate button in master mode", () => {
    const { rerender } = render(<Harness {...baseProps} mode="master" />);
    expect(screen.getByRole("button", { name: "UMPIRE解説を生成" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再生成" })).toBeInTheDocument();

    rerender(<Harness {...baseProps} mode="custom" />);
    expect(screen.getByRole("button", { name: "UMPIRE解説を生成" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "再生成" })).not.toBeInTheDocument();
  });

  it("calls onGenerate(false) for the generate button and onGenerate(true) for regenerate", () => {
    const onGenerate = vi.fn();
    render(<Harness {...baseProps} mode="master" onGenerate={onGenerate} />);

    fireEvent.click(screen.getByRole("button", { name: "UMPIRE解説を生成" }));
    expect(onGenerate).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "再生成" }));
    expect(onGenerate).toHaveBeenLastCalledWith(true);
  });

  it("disables both buttons when generateDisabled is true", () => {
    render(<Harness {...baseProps} mode="master" generateDisabled />);
    expect(screen.getByRole("button", { name: "UMPIRE解説を生成" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "再生成" })).toBeDisabled();
  });

  it("shows a loading label while generating", () => {
    render(<Harness {...baseProps} mode="master" isGenerating />);
    expect(screen.getByRole("button", { name: "生成中…" })).toBeInTheDocument();
  });

  it("shows the generation error", () => {
    render(<Harness {...baseProps} mode="custom" generateError="UMPIRE生成が利用できません。" />);
    expect(screen.getByText("UMPIRE生成が利用できません。")).toBeInTheDocument();
  });

  it("shows the cached badge only when umpireCached is true", () => {
    const { rerender } = render(<Harness {...baseProps} mode="master" umpireText="U: explanation" umpireCached={false} />);
    expect(screen.queryByText("保存済みの解説を再利用しました")).not.toBeInTheDocument();

    rerender(<Harness {...baseProps} mode="master" umpireText="U: explanation" umpireCached={null} />);
    expect(screen.queryByText("保存済みの解説を再利用しました")).not.toBeInTheDocument();

    rerender(<Harness {...baseProps} mode="master" umpireText="U: explanation" umpireCached={true} />);
    expect(screen.getByText("保存済みの解説を再利用しました")).toBeInTheDocument();
  });

  it("does not render the explanation panel when there is no umpireText", () => {
    render(<Harness {...baseProps} mode="master" umpireText={null} />);
    expect(screen.queryByText("保存済みの解説を再利用しました")).not.toBeInTheDocument();
  });
});
