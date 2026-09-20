export const DONATE_PRESETS_CENTS = [300, 500, 1000] as const;
export const DONATE_DEFAULT_CENTS = 500;
export const DONATE_MIN_CENTS = 100;
export const DONATE_MAX_CENTS = 50_000;
export const DONATE_HIDE_KEY = "killsql-donate-hide-until";

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDonateHiddenToday() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DONATE_HIDE_KEY) === localDateString();
  } catch {
    return false;
  }
}

export function hideDonateForToday() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DONATE_HIDE_KEY, localDateString());
  } catch {
    // Ignore private-mode / quota failures.
  }
}

export function isValidDonateAmount(cents: unknown): cents is number {
  return (
    typeof cents === "number" &&
    Number.isInteger(cents) &&
    cents >= DONATE_MIN_CENTS &&
    cents <= DONATE_MAX_CENTS
  );
}

export function parseDollarInput(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars)) return null;
  const cents = Math.round(dollars * 100);
  return isValidDonateAmount(cents) ? cents : null;
}

export function formatDonateDollars(cents: number) {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function sanitizeReturnPath(path: unknown): string {
  if (typeof path !== "string") return "/problems";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://") || path.includes("\\")) {
    return "/problems";
  }
  return path;
}
