export type AuthConfig = {
  githubClientId: string;
  githubClientSecret: string;
  githubAllowedUsername: string;
  sessionSecret: string;
  isProduction: boolean;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function loadAuthConfig(): AuthConfig {
  const sessionSecret = requiredEnv("SESSION_SECRET");
  if (sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }

  return {
    githubClientId: requiredEnv("GITHUB_CLIENT_ID"),
    githubClientSecret: requiredEnv("GITHUB_CLIENT_SECRET"),
    githubAllowedUsername: requiredEnv("GITHUB_ALLOWED_USERNAME"),
    sessionSecret,
    isProduction: process.env.NODE_ENV === "production",
  };
}
