#!/usr/bin/env node
/**
 * From 2026-10-30 Supabase no longer auto-grants Data API access on new
 * public tables. Fail CI unless every public table created in
 * supabase/migrations has an explicit GRANT to anon, authenticated,
 * service_role, or PUBLIC (in that migration or a later one).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "supabase", "migrations");
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

const tables = [];
const grants = [];

for (const file of files) {
  const sql = stripComments(readFileSync(path.join(dir, file), "utf8"));

  const createRe =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:only\s+)?(?:public\s*\.\s*)([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let match;
  while ((match = createRe.exec(sql))) {
    tables.push({ file, name: match[1].toLowerCase() });
  }

  const grantRe =
    /grant\s+(?:all(?:\s+privileges)?|select|insert|update|delete)(?:\s*,\s*(?:select|insert|update|delete))*\s+on\s+(?:table\s+)?(?:public\s*\.\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s+to\s+(anon|authenticated|service_role|public)\b/gi;
  while ((match = grantRe.exec(sql))) {
    grants.push({
      file,
      name: match[1].toLowerCase(),
      role: match[2].toLowerCase(),
    });
  }
}

const dataApiRoles = new Set(["anon", "authenticated", "service_role", "public"]);
const missing = [];

for (const table of tables) {
  const covered = grants.some(
    (grant) =>
      grant.name === table.name &&
      dataApiRoles.has(grant.role) &&
      grant.file >= table.file,
  );
  if (!covered) missing.push(table);
}

if (missing.length > 0) {
  console.error(
    "Public tables created without a Data API GRANT (required after 2026-10-30):\n",
  );
  for (const table of missing) {
    console.error(`  ${table.file}: public.${table.name}`);
    console.error(`    grant select on public.${table.name} to anon;`);
    console.error(
      `    grant select, insert, update, delete on public.${table.name} to authenticated;`,
    );
    console.error(
      `    grant select, insert, update, delete on public.${table.name} to service_role;`,
    );
    console.error("");
  }
  console.error(
    "Add those statements in the migration that creates the table (or a later one). Narrower grants are fine when RLS should keep a role out; at least one of anon, authenticated, service_role, or PUBLIC must be granted.",
  );
  process.exit(1);
}

console.log(
  `Data API grants check passed (${tables.length} public tables in ${files.length} migrations).`,
);
