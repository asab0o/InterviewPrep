import express, { type ErrorRequestHandler } from "express";
import session from "express-session";
import createSqliteStore from "better-sqlite3-session-store";
import type Database from "better-sqlite3";
import type { AnthropicConfig, AuthConfig } from "./config";
import { configurePassport } from "./auth/passport";
import { createAuthRouter } from "./auth/routes";
import { createRequireAuth } from "./middleware/require-auth";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./db/schema";
import { AttemptService } from "./attempts/service";
import { createAttemptRouter } from "./attempts/routes";
import { ApiError } from "./errors";
import { DashboardService } from "./dashboard/service";
import { createDashboardRouter } from "./dashboard/routes";
import { MasterService } from "./master/service";
import { createMasterRouter } from "./master/routes";
import { createAnthropicTranslateFn, TranslateService } from "./translate/service";
import { createTranslateRouter } from "./translate/routes";

const SqliteStore = createSqliteStore(session);

export function createApp(config: AuthConfig, sqlite: Database.Database, anthropicConfig: AnthropicConfig | null = null) {
  const app = express();
  const passport = configurePassport(config);
  const requireAuth = createRequireAuth(config.githubAllowedUsername);
  const db = drizzle(sqlite, { schema });
  const translateService = new TranslateService(anthropicConfig ? createAnthropicTranslateFn(anthropicConfig) : null);

  if (config.isProduction) app.set("trust proxy", 1);
  app.use(express.json());
  app.use(session({
    name: "interviewprep.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new SqliteStore({ client: sqlite }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/auth", createAuthRouter(passport, requireAuth));
  app.use("/api", requireAuth);
  app.use("/api", createMasterRouter(new MasterService(db)));
  app.use("/api/attempts", createAttemptRouter(new AttemptService(db)));
  app.use("/api/dashboard", createDashboardRouter(new DashboardService(db)));
  app.use("/api/translate", createTranslateRouter(translateService));

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    console.error(error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  };
  app.use(errorHandler);
  return app;
}
