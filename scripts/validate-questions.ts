import fs from "node:fs";
import path from "node:path";
import { TAG_TAXONOMY, type Question } from "../packages/question-types/src/index";
import { validateResult } from "../apps/web/lib/validator";
import { runQuestionSolution } from "./duckdb-exec";
import { DIFFICULTIES, loadAllQuestions, questionsRoot } from "./questions-fs";

const REQUIRED: (keyof Question)[] = [
  "id",
  "slug",
  "title",
  "difficulty",
  "tags",
  "description",
  "schema_sql",
  "solution_sql",
  "test_cases",
  "hints",
  "explanation",
  "created_at",
];

const ALLOWED_TAGS = new Set<string>(TAG_TAXONOMY);

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function err(file: string, message: string) {
  errors += 1;
  console.error(`✗ ${file}: ${message}`);
}

let errors = 0;

async function main() {
  const root = questionsRoot();
  if (!fs.existsSync(root)) fail(`questions directory not found: ${root}`);

  const questions = loadAllQuestions(root);
  if (questions.length === 0) fail("No questions found.");

  const slugs = new Set<string>();
  const ids = new Set<string>();

  for (const difficulty of DIFFICULTIES) {
    const dir = path.join(root, difficulty);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const full = path.join(dir, file);
      let q: Question;
      try {
        q = JSON.parse(fs.readFileSync(full, "utf8")) as Question;
      } catch {
        err(file, "invalid JSON");
        continue;
      }

      for (const key of REQUIRED) {
        if (q[key] === undefined || q[key] === null || q[key] === "") {
          err(file, `missing ${key}`);
        }
      }

      if (q.difficulty !== difficulty) {
        err(file, `difficulty "${q.difficulty}" does not match folder "${difficulty}"`);
      }

      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(q.slug)) {
        err(file, `slug "${q.slug}" must be kebab-case`);
      }

      const expectedName = `${q.id}-${q.slug}.json`;
      if (file !== expectedName) {
        err(file, `filename should be ${expectedName}`);
      }

      if (slugs.has(q.slug)) err(file, `duplicate slug "${q.slug}"`);
      slugs.add(q.slug);

      if (ids.has(q.id)) err(file, `duplicate id "${q.id}"`);
      ids.add(q.id);

      if (!Array.isArray(q.tags) || q.tags.length === 0) err(file, "tags must be a non-empty array");
      else {
        for (const tag of q.tags) {
          if (!ALLOWED_TAGS.has(tag)) err(file, `unknown tag "${tag}"`);
        }
      }
      if (!Array.isArray(q.hints) || q.hints.length === 0) err(file, "hints must be a non-empty array");
      if (!Array.isArray(q.test_cases) || q.test_cases.length === 0) {
        err(file, "test_cases must be a non-empty array");
      } else {
        for (const tc of q.test_cases) {
          if (!tc.id || !tc.description) err(file, "test case missing id or description");
          if (typeof tc.validate_order !== "boolean") err(file, `test ${tc.id}: validate_order must be boolean`);
          if (q.difficulty === "hard" && (!tc.expected_rows || tc.expected_rows.length === 0)) {
            err(file, `test ${tc.id}: hard questions need expected_rows`);
          }
        }
      }

      if (!q.schema_sql.toLowerCase().includes("create table")) {
        err(file, "schema_sql should create at least one table");
      }
      if (!q.solution_sql.toLowerCase().includes("select")) {
        err(file, "solution_sql should contain a SELECT");
      }
    }
  }

  if (errors > 0) fail(`${errors} schema validation error(s) across ${questions.length} questions`);
  console.log(`✓ ${questions.length} questions passed schema validation`);

  let execErrors = 0;
  for (const q of questions) {
    const file = `${q.id}-${q.slug}.json`;
    try {
      const result = await runQuestionSolution(q.schema_sql, q.solution_sql);
      const verdict = validateResult(result, q.test_cases, result);
      if (!verdict.passed) {
        execErrors += 1;
        const failed = verdict.tests.filter((test) => !test.passed);
        const detail = failed.map((test) => `${test.id}: ${test.message}`).join("; ");
        console.error(`✗ ${file}: solution failed tests (${detail || verdict.diff?.message || "unknown"})`);
      }
    } catch (cause) {
      execErrors += 1;
      const message = cause instanceof Error ? cause.message : String(cause);
      console.error(`✗ ${file}: solution did not run (${message})`);
    }
  }

  if (execErrors > 0) fail(`${execErrors} solution(s) failed DuckDB execution`);
  console.log(`✓ ${questions.length} solutions passed DuckDB execution`);
}

main().catch((cause) => {
  fail(cause instanceof Error ? cause.message : String(cause));
});
