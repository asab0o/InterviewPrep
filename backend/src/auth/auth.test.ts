import express, { type NextFunction, type Request, type Response } from "express";
import type passport from "passport";
import type { Profile } from "passport-github2";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuthRouter } from "./routes";
import { isAllowedUser, toAuthUser, type AuthUser } from "./user";
import { createRequireAuth } from "../middleware/require-auth";

const allowedUser: AuthUser = {
  id: "123",
  username: "asab0o",
  displayName: "Asaboo",
  avatarUrl: "https://example.com/avatar.png",
};

function fakePassport(callbackUser: AuthUser | false): typeof passport {
  return {
    authenticate: (_strategy: string, callback?: (error: unknown, user: AuthUser | false) => void) => {
      return (_req: Request, _res: Response, _next: NextFunction) => callback?.(null, callbackUser);
    },
  } as unknown as typeof passport;
}

describe("auth", () => {
  it("maps a GitHub profile without retaining OAuth tokens", () => {
    const profile = {
      id: "123",
      username: "asab0o",
      displayName: "Asaboo",
      photos: [{ value: "https://example.com/avatar.png" }],
    } as Profile;

    expect(toAuthUser(profile)).toEqual(allowedUser);
  });

  it("compares GitHub usernames case-insensitively", () => {
    expect(isAllowedUser("AsAb0o", "asab0o")).toBe(true);
    expect(isAllowedUser("someone-else", "asab0o")).toBe(false);
  });

  it("rejects unauthenticated requests", async () => {
    const app = express();
    app.get("/protected", createRequireAuth("asab0o"), (_req, res) => res.sendStatus(204));

    const response = await request(app).get("/protected");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("checks the allowed username again on protected routes", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.isAuthenticated = () => true;
      req.user = { ...allowedUser, username: "someone-else" };
      next();
    });
    app.get("/protected", createRequireAuth("asab0o"), (_req, res) => res.sendStatus(204));

    expect((await request(app).get("/protected")).status).toBe(403);
  });

  it("returns only the public session user fields from /auth/me", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.isAuthenticated = () => true;
      req.user = allowedUser;
      next();
    });
    app.use("/auth", createAuthRouter(fakePassport(allowedUser), createRequireAuth("asab0o")));

    const response = await request(app).get("/auth/me");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      username: "asab0o",
      displayName: "Asaboo",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("returns 403 when the OAuth callback receives a disallowed user", async () => {
    const app = express();
    app.use("/auth", createAuthRouter(fakePassport(false), createRequireAuth("asab0o")));

    const response = await request(app).get("/auth/github/callback");
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});
