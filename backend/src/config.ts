export type AuthConfig = {
  githubClientId: string;
  githubClientSecret: string;
  githubAllowedUsername: string;
  sessionSecret: string;
  isProduction: boolean;
  publicAppUrl: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

// OAuthのredirect_uriはGitHub側の登録値と完全一致が必要。プロキシ経路（CloudFront→nginx）は
// X-Forwarded-Proto が常にhttpのため自動判定に任せず、この値から絶対URLで組み立てる。
function loadPublicAppUrl(isProduction: boolean): string {
  const raw = requiredEnv("PUBLIC_APP_URL").replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("PUBLIC_APP_URL must be an absolute URL (e.g. https://main.xxxxx.amplifyapp.com)");
  }
  if (isProduction && url.protocol !== "https:") {
    throw new Error("PUBLIC_APP_URL must use https in production");
  }
  return raw;
}

export function loadAuthConfig(): AuthConfig {
  const sessionSecret = requiredEnv("SESSION_SECRET");
  if (sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  const isProduction = process.env.NODE_ENV === "production";

  return {
    githubClientId: requiredEnv("GITHUB_CLIENT_ID"),
    githubClientSecret: requiredEnv("GITHUB_CLIENT_SECRET"),
    githubAllowedUsername: requiredEnv("GITHUB_ALLOWED_USERNAME"),
    sessionSecret,
    isProduction,
    publicAppUrl: loadPublicAppUrl(isProduction),
  };
}

export type AnthropicConfig = {
  apiKey: string;
  translateModel: string;
  umpireModel: string;
};

const DEFAULT_TRANSLATE_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_UMPIRE_MODEL = "claude-sonnet-5";

// APIキー未設定でもサーバー全体は起動できる必要がある（翻訳/UMPIRE機能以外は動く）。
// そのため起動時にthrowするrequiredEnvは使わず、呼び出し側（各機能のservice/route）で
// 未設定時にApiErrorへ変換する。
export function loadAnthropicConfig(): AnthropicConfig | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    translateModel: process.env.ANTHROPIC_MODEL_TRANSLATE?.trim() || DEFAULT_TRANSLATE_MODEL,
    umpireModel: process.env.ANTHROPIC_MODEL_UMPIRE?.trim() || DEFAULT_UMPIRE_MODEL,
  };
}

export type GithubConfig = {
  repoOwner: string;
  repoName: string;
  pushToken: string;
};

// ログイン用OAuthとは別のFine-grained PAT。3つのenvが揃っていなければサーバー全体は
// 起動できる（push機能以外に影響させない）ため、loadAnthropicConfigと同様にthrowせずnullを返す。
// 呼び出し側（GithubService）で未設定時に503 GITHUB_UNAVAILABLEへ変換する。
export function loadGithubConfig(): GithubConfig | null {
  const repoOwner = process.env.GITHUB_REPO_OWNER?.trim();
  const repoName = process.env.GITHUB_REPO_NAME?.trim();
  const pushToken = process.env.GITHUB_PUSH_TOKEN?.trim();
  if (!repoOwner || !repoName || !pushToken) return null;

  return { repoOwner, repoName, pushToken };
}
