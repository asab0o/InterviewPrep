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
