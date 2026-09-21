export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "callback",
  "donate",
  "killsql",
  "leaderboard",
  "learn",
  "login",
  "me",
  "onboarding",
  "problems",
  "profile",
  "settings",
  "signup",
  "streak",
  "support",
  "user",
  "welcome",
  "www",
]);

export function sanitizeUsername(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

export function usernameIssue(raw: string): string | null {
  if (!raw) return null;
  if (!USERNAME_PATTERN.test(raw)) {
    return "Use 3–24 characters: lowercase letters, numbers, and underscores.";
  }
  if (RESERVED_USERNAMES.has(raw)) {
    return "That username is reserved.";
  }
  return null;
}
