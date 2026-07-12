import { Router, type NextFunction, type Request, type Response } from "express";
import type passport from "passport";
import type { AuthUser } from "./user";

export function createAuthRouter(passportInstance: typeof passport, requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>) {
  const router = Router();

  router.get("/github", passportInstance.authenticate("github"));

  router.get("/github/callback", (req: Request, res: Response, next: NextFunction) => {
    passportInstance.authenticate("github", (error: unknown, user: AuthUser | false) => {
      if (error) return next(error);
      if (!user) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "GitHub account is not allowed" } });
        return;
      }
      req.logIn(user, (loginError) => {
        if (loginError) return next(loginError);
        res.redirect("/");
      });
    })(req, res, next);
  });

  router.get("/me", requireAuth, (req, res) => {
    const user = req.user as AuthUser;
    res.json({ username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl });
  });

  router.post("/logout", requireAuth, (req, res, next) => {
    req.logout((logoutError) => {
      if (logoutError) return next(logoutError);
      req.session.destroy((sessionError) => {
        if (sessionError) return next(sessionError);
        res.clearCookie("interviewprep.sid");
        res.status(204).end();
      });
    });
  });

  return router;
}
