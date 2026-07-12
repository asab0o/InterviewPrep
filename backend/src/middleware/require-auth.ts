import type { NextFunction, Request, Response } from "express";
import type { AuthUser } from "../auth/user";
import { isAllowedUser } from "../auth/user";

export function createRequireAuth(allowedUsername: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated?.() || !req.user) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login required" } });
      return;
    }

    const user = req.user as AuthUser;
    if (!isAllowedUser(user.username, allowedUsername)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Not the allowed user" } });
      return;
    }
    next();
  };
}
