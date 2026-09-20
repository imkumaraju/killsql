import fs from "node:fs";
import path from "node:path";
import type { Question, QuestionSummary } from "../packages/question-types/src/index";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function questionsRoot(from = process.cwd()): string {
  const candidates = [
    path.resolve(from, "questions"),
    path.resolve(from, "../../questions"),
    path.resolve(from, "../questions"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

export function loadAllQuestions(root = questionsRoot()): Question[] {
  const questions: Question[] = [];
  for (const difficulty of DIFFICULTIES) {
    const dir = path.join(root, difficulty);
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json") && f !== "index.json")
      .sort();
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      questions.push(JSON.parse(raw) as Question);
    }
  }
  return questions.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export function toSummary(q: Question): QuestionSummary {
  return {
    id: q.id,
    slug: q.slug,
    title: q.title,
    difficulty: q.difficulty,
    tags: q.tags,
    companies: q.companies,
  };
}
