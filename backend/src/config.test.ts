import { afterEach, describe, expect, it } from "vitest";
import { loadAnthropicConfig, loadAuthConfig } from "./config";

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
    process.env.PUBLIC_APP_URL = "https://main.xxxxx.amplifyapp.com/";

    expect(loadAuthConfig()).toEqual({
      githubClientId: "client-id",
      githubClientSecret: "client-secret",
      githubAllowedUsername: "asab0o",
      sessionSecret: "a-secure-session-secret-with-32-chars",
      isProduction: true,
      publicAppUrl: "https://main.xxxxx.amplifyapp.com",
    });
  });

  it("rejects a non-https PUBLIC_APP_URL in production", () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    process.env.GITHUB_ALLOWED_USERNAME = "asab0o";
    process.env.SESSION_SECRET = "a-secure-session-secret-with-32-chars";
    process.env.NODE_ENV = "production";
    process.env.PUBLIC_APP_URL = "http://main.xxxxx.amplifyapp.com";

    expect(() => loadAuthConfig()).toThrow("PUBLIC_APP_URL must use https in production");
  });

  it("rejects a relative PUBLIC_APP_URL", () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    process.env.GITHUB_ALLOWED_USERNAME = "asab0o";
    process.env.SESSION_SECRET = "a-secure-session-secret-with-32-chars";
    process.env.NODE_ENV = "development";
    process.env.PUBLIC_APP_URL = "/auth/github/callback";

    expect(() => loadAuthConfig()).toThrow("PUBLIC_APP_URL must be an absolute URL");
  });
});

describe("loadAnthropicConfig", () => {
  it("returns null when ANTHROPIC_API_KEY is not set (server must still boot)", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(loadAnthropicConfig()).toBeNull();
  });

  it("returns null when ANTHROPIC_API_KEY is blank", () => {
    process.env.ANTHROPIC_API_KEY = "   ";
    expect(loadAnthropicConfig()).toBeNull();
  });

  it("falls back to the default translate model when unset", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    delete process.env.ANTHROPIC_MODEL_TRANSLATE;

    expect(loadAnthropicConfig()).toEqual({
      apiKey: "sk-ant-test",
      translateModel: "claude-haiku-4-5-20251001",
    });
  });

  it("uses the configured translate model when set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ANTHROPIC_MODEL_TRANSLATE = "claude-haiku-9000";

    expect(loadAnthropicConfig()).toEqual({
      apiKey: "sk-ant-test",
      translateModel: "claude-haiku-9000",
    });
  });
});
