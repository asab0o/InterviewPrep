import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { AnthropicConfig } from "../config";
import * as schema from "../db/schema";
import { problems } from "../db/schema";
import { ApiError } from "../errors";
import { buildUmpirePrompt } from "./prompt";

type Db = BetterSQLite3Database<typeof schema>;

export type GenerateUmpireResponse = { umpireExplanation: string; cached: boolean; generatedAt: string };
export type PreviewUmpireResponse = { umpireExplanation: string; generatedAt: string };

// サービスへ注入するUMPIRE解説生成関数。テストでは実APIを叩かずここをモックする。
export type UmpireGenerateFn = (problemStatement: string) => Promise<string>;

export function createAnthropicUmpireFn(config: AnthropicConfig): UmpireGenerateFn {
  const client = new Anthropic({ apiKey: config.apiKey });

  return async (problemStatement: string): Promise<string> => {
    const response = await client.messages.create({
      model: config.umpireModel,
      // UMPIRE解説は6セクション＋コード＋各説明を含む長文になるため、Sonnet系が対応する
      // 上限に近い8192を確保する（それでも打ち切られた場合はstop_reasonで検知しthrowする）。
      max_tokens: 8192,
      messages: [{ role: "user", content: buildUmpirePrompt(problemStatement) }],
    });

    // max_tokensで打ち切られた不完全な解説をキャッシュ保存してしまうと、ユーザーが
    // 明示的に再生成するまで不完全な内容が使われ続ける（キャッシュ再利用仕様のため）。
    // 打ち切りを検知した場合は結果を使わずthrowし、502 UMPIRE_FAILEDとして扱う。
    if (response.stop_reason === "max_tokens") {
      throw new Error("Anthropic response was truncated (stop_reason=max_tokens)");
    }

    const textBlock = response.content.find((block) => block.type === "text");
    const explanation = textBlock?.text.trim();
    if (!explanation) throw new Error("Anthropic response did not contain UMPIRE explanation text");
    return explanation;
  };
}

export class UmpireService {
  // generateFn が null ＝ ANTHROPIC_API_KEY 未設定（サーバー自体は起動している状態）。
  constructor(
    private readonly generateFn: UmpireGenerateFn | null,
    private readonly db: Db,
  ) {}

  async generateForProblem(id: number, problemStatement: string, force: boolean): Promise<GenerateUmpireResponse> {
    const problem = this.db.select({
      id: problems.id,
      umpireExplanation: problems.umpireExplanation,
      umpireGeneratedAt: problems.umpireGeneratedAt,
    }).from(problems).where(eq(problems.id, id)).get();

    if (!problem) throw new ApiError(404, "PROBLEM_NOT_FOUND", "Problem not found");

    if (!force && problem.umpireExplanation !== null && problem.umpireGeneratedAt !== null) {
      return {
        umpireExplanation: problem.umpireExplanation,
        cached: true,
        generatedAt: problem.umpireGeneratedAt.toISOString(),
      };
    }

    const umpireExplanation = await this.generate(problemStatement);
    const generatedAt = new Date();

    this.db.update(problems)
      .set({ umpireExplanation, umpireGeneratedAt: generatedAt })
      .where(eq(problems.id, id))
      .run();

    return { umpireExplanation, cached: false, generatedAt: generatedAt.toISOString() };
  }

  async preview(problemStatement: string): Promise<PreviewUmpireResponse> {
    const umpireExplanation = await this.generate(problemStatement);
    return { umpireExplanation, generatedAt: new Date().toISOString() };
  }

  private async generate(problemStatement: string): Promise<string> {
    if (!this.generateFn) {
      throw new ApiError(503, "UMPIRE_UNAVAILABLE", "UMPIRE explanation generation service is not configured");
    }

    try {
      return await this.generateFn(problemStatement);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, "UMPIRE_FAILED", "Failed to generate UMPIRE explanation");
    }
  }
}
