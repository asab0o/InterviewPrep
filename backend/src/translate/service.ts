import Anthropic from "@anthropic-ai/sdk";
import type { AnthropicConfig } from "../config";
import { ApiError } from "../errors";

export type TranslateResponse = { japanese: string };

// サービスへ注入する翻訳関数。テストでは実APIを叩かずここをモックする。
export type TranslateFn = (english: string) => Promise<string>;

const SYSTEM_PROMPT =
  "You are a professional English-to-Japanese translator supporting a software engineer preparing for " +
  "technical coding interviews. Translate the given English phrase into natural, idiomatic Japanese as it " +
  "would be used when explaining a solution or discussing an algorithm in an interview. " +
  "Reply with only the Japanese translation. Do not add quotation marks, explanations, or English text.";

export function createAnthropicTranslateFn(config: AnthropicConfig): TranslateFn {
  const client = new Anthropic({ apiKey: config.apiKey });

  return async (english: string): Promise<string> => {
    const response = await client.messages.create({
      model: config.translateModel,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: english }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const japanese = textBlock?.text.trim();
    if (!japanese) throw new Error("Anthropic response did not contain translated text");
    return japanese;
  };
}

export class TranslateService {
  // translateFn が null ＝ ANTHROPIC_API_KEY 未設定（サーバー自体は起動している状態）。
  constructor(private readonly translateFn: TranslateFn | null) {}

  async translate(english: string): Promise<TranslateResponse> {
    if (!this.translateFn) {
      throw new ApiError(503, "TRANSLATE_UNAVAILABLE", "Translation service is not configured");
    }

    try {
      const japanese = await this.translateFn(english);
      return { japanese };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, "TRANSLATE_FAILED", "Failed to generate translation");
    }
  }
}
