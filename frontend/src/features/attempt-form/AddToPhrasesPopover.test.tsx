import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddToPhrasesPopover } from "./AddToPhrasesPopover";

function selectContents(node: Node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function Harness({ onAdd }: { onAdd: (text: string) => void }) {
  return (
    <div>
      <span data-testid="outside">Outside unrelated text</span>
      <AddToPhrasesPopover onAdd={onAdd}>
        <p data-testid="inside">Selectable inside text</p>
      </AddToPhrasesPopover>
    </div>
  );
}

describe("AddToPhrasesPopover", () => {
  it("shows the popup when selecting text inside, and calls onAdd with the selected text", async () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} />);

    selectContents(screen.getByTestId("inside"));

    fireEvent.click(await screen.findByRole("button", { name: "Add to phrases" }));
    expect(onAdd).toHaveBeenCalledWith("Selectable inside text");
    expect(screen.queryByRole("button", { name: "Add to phrases" })).not.toBeInTheDocument();
  });

  it("hides the popup once the selection is cleared", async () => {
    render(<Harness onAdd={vi.fn()} />);
    selectContents(screen.getByTestId("inside"));
    expect(await screen.findByRole("button", { name: "Add to phrases" })).toBeInTheDocument();

    window.getSelection()?.removeAllRanges();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Add to phrases" })).not.toBeInTheDocument());
  });

  it("hides the popup when clicking outside the panel", async () => {
    render(<Harness onAdd={vi.fn()} />);
    selectContents(screen.getByTestId("inside"));
    expect(await screen.findByRole("button", { name: "Add to phrases" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("button", { name: "Add to phrases" })).not.toBeInTheDocument();
  });

  it("does not show the popup when the selection extends outside the panel (drag across the boundary)", async () => {
    render(<Harness onAdd={vi.fn()} />);
    const inside = screen.getByTestId("inside").firstChild!;
    const outside = screen.getByTestId("outside").firstChild!;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.setBaseAndExtent(inside, 0, outside, 5);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("button", { name: "Add to phrases" })).not.toBeInTheDocument();
  });
});
