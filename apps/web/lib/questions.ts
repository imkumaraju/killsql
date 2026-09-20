import fs from "node:fs";
import path from "node:path";
import type { Question, QuestionSummary } from "@killsql/question-types";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const QUESTIONS_ROOT = path.join(process.cwd(), "public", "questions");

export function loadQuestionSummaries(): QuestionSummary[] {
  const indexPath = path.join(QUESTIONS_ROOT, "index.json");
  if (fs.existsSync(indexPath)) {
    return JSON.parse(fs.readFileSync(indexPath, "utf8")) as QuestionSummary[];
  }
  return loadAllQuestions().map((question) => ({
    id: question.id,
    slug: question.slug,
    title: question.title,
    difficulty: question.difficulty,
    tags: question.tags,
    companies: question.companies,
  }));
}

export function loadAllQuestions(): Question[] {
  const questions: Question[] = [];
  for (const difficulty of DIFFICULTIES) {
    const folder = path.join(QUESTIONS_ROOT, difficulty);
    if (!fs.existsSync(folder)) continue;
    const files = fs
      .readdirSync(folder)
      .filter((file) => file.endsWith(".json"))
      .sort();
    for (const file of files) {
      questions.push(
        JSON.parse(fs.readFileSync(path.join(folder, file), "utf8")) as Question,
      );
    }
  }
  return questions.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export function loadQuestionBySlug(slug: string): Question | null {
  return loadAllQuestions().find((question) => question.slug === slug) ?? null;
}

export function allTags(questions = loadQuestionSummaries()) {
  return [...new Set(questions.flatMap((question) => question.tags))].sort();
}
