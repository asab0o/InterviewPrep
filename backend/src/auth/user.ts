import type { Profile } from "passport-github2";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export function toAuthUser(profile: Profile): AuthUser | null {
  if (!profile.username) return null;

  const photo = profile.photos?.[0]?.value;
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName || null,
    avatarUrl: photo || null,
  };
}

export function isAllowedUser(username: string, allowedUsername: string): boolean {
  return username.toLowerCase() === allowedUsername.toLowerCase();
}
