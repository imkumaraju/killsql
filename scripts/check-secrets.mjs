#!/usr/bin/env node
/**
 * Fail CI if env files or live-looking keys are tracked in git.
 * Placeholders in .env.example are allowed.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const tracked = execFileSync("git", ["ls-files", "-z"])
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const forbiddenNames = [
  /^\.env$/,
  /^\.env\./,
  /\.pem$/,
  /(^|\/)credentials\.json$/,
  /(^|\/)id_rsa$/,
  /(^|\/)id_ed25519$/,
];

const allowedEnvExamples = new Set([".env.example", "apps/web/.env.example"]);

const nameHits = tracked.filter((file) => {
  const unix = file.replaceAll("\\", "/");
  if (allowedEnvExamples.has(unix)) return false;
  return forbiddenNames.some((pattern) => pattern.test(unix));
});

if (nameHits.length > 0) {
  console.error("Tracked files that must not be in git:\n" + nameHits.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}

const secretPatterns = [
  { name: "Supabase service-role JWT", re: /eyJ[A-Za-z0-9_-]+\.eyJ[^"'\s]*service_role/ },
  { name: "Stripe live secret", re: /sk_live_[A-Za-z0-9]{10,}/ },
  { name: "GitHub token", re: /\b(ghp|github_pat)_[A-Za-z0-9_]{20,}/ },
];

const skipContent = new Set(["package-lock.json"]);
let contentHits = 0;

for (const file of tracked) {
  const unix = file.replaceAll("\\", "/");
  if (skipContent.has(unix) || unix.endsWith(".lock")) continue;
  const abs = path.join(root, file);
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    continue;
  }
  if (text.includes("\u0000") || text.length > 1_000_000) continue;

  for (const { name, re } of secretPatterns) {
    if (re.test(text)) {
      console.error(`Possible ${name} in ${unix}`);
      contentHits += 1;
    }
  }
}

if (contentHits > 0) {
  console.error("Remove live keys from git. Put them in GitHub Actions secrets / Vercel env / apps/web/.env.local.");
  process.exit(1);
}

console.log(`Secrets check passed (${tracked.length} tracked files).`);
