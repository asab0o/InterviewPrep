import { describe, expect, it, vi } from "vitest";
import type { AnthropicConfig } from "../config";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

describe("createAnthropicUmpireFn", () => {
  it("sends the appendix B prompt with the placeholder replaced by the problem statement, using the umpire model", async () => {
    createMock.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "  generated UMPIRE script  " }],
    });

    const { createAnthropicUmpireFn } = await import("./service");
    const config: AnthropicConfig = {
      apiKey: "sk-ant-test",
      translateModel: "claude-haiku-4-5-20251001",
      umpireModel: "claude-sonnet-5",
    };
    const generateFn = createAnthropicUmpireFn(config);

    const result = await generateFn("Given an array nums, return indices of the two numbers...");

    expect(result).toBe("generated UMPIRE script");
    expect(createMock).toHaveBeenCalledTimes(1);
    const callArgs = createMock.mock.calls[0][0] as {
      model: string;
      max_tokens: number;
      messages: { role: string; content: string }[];
    };
    expect(callArgs.model).toBe("claude-sonnet-5");
    expect(callArgs.max_tokens).toBe(8192);
    const prompt = callArgs.messages[0].content;
    expect(prompt).not.toContain("[PASTE LEETCODE PROBLEM HERE]");
    expect(prompt.endsWith("Given an array nums, return indices of the two numbers...")).toBe(true);
    expect(prompt).toContain("You are a senior software engineer interviewer and English speaking coach.");
    expect(prompt).toContain("Now generate the UMPIRE interview script for the following problem:");
  });

  it("throws when the Anthropic response has no text content", async () => {
    createMock.mockResolvedValue({ stop_reason: "end_turn", content: [] });

    const { createAnthropicUmpireFn } = await import("./service");
    const config: AnthropicConfig = {
      apiKey: "sk-ant-test",
      translateModel: "claude-haiku-4-5-20251001",
      umpireModel: "claude-sonnet-5",
    };
    const generateFn = createAnthropicUmpireFn(config);

    await expect(generateFn("some problem")).rejects.toThrow("did not contain UMPIRE explanation text");
  });

  it("throws when the Anthropic response was truncated (stop_reason=max_tokens), never returning a partial explanation", async () => {
    createMock.mockResolvedValue({
      stop_reason: "max_tokens",
      content: [{ type: "text", text: "# Understand\nSpoken Script:\n...(truncated mid-sentence" }],
    });

    const { createAnthropicUmpireFn } = await import("./service");
    const config: AnthropicConfig = {
      apiKey: "sk-ant-test",
      translateModel: "claude-haiku-4-5-20251001",
      umpireModel: "claude-sonnet-5",
    };
    const generateFn = createAnthropicUmpireFn(config);

    await expect(generateFn("some problem")).rejects.toThrow(/max_tokens/);
  });
});
