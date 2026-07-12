import { afterEach, describe, expect, it } from "vitest";
import { loadAuthConfig } from "./config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("loadAuthConfig", () => {
  it("fails fast when the session secret is too short", () => {
    process.env.SESSION_SECRET = "short";
    expect(() => loadAuthConfig()).toThrow("SESSION_SECRET must be at least 32 characters");
  });

  it("loads required authentication settings", () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    process.env.GITHUB_ALLOWED_USERNAME = "asab0o";
    process.env.SESSION_SECRET = "a-secure-session-secret-with-32-chars";
    process.env.NODE_ENV = "production";

    expect(loadAuthConfig()).toEqual({
      githubClientId: "client-id",
      githubClientSecret: "client-secret",
      githubAllowedUsername: "asab0o",
      sessionSecret: "a-secure-session-secret-with-32-chars",
      isProduction: true,
    });
  });
});
