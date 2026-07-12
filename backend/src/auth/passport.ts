import passport from "passport";
import { Strategy as GitHubStrategy, type Profile } from "passport-github2";
import type { AuthConfig } from "../config";
import { isAllowedUser, toAuthUser, type AuthUser } from "./user";

export function configurePassport(config: AuthConfig): typeof passport {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.githubClientId,
        clientSecret: config.githubClientSecret,
        callbackURL: `${config.publicAppUrl}/auth/github/callback`,
        scope: ["read:user"],
        state: "enabled",
      },
      (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: AuthUser | false) => void,
      ) => {
        const user = toAuthUser(profile);
        if (!user || !isAllowedUser(user.username, config.githubAllowedUsername)) {
          done(null, false);
          return;
        }
        done(null, user);
      },
    ),
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user: AuthUser, done) => done(null, user));
  return passport;
}
