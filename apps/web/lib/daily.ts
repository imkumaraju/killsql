import type { QuestionSummary } from "@killsql/question-types";

export function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function pickDaily<T>(items: T[], date = new Date()): T | undefined {
  if (items.length === 0) return undefined;
  const key = utcDateKey(date);
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return items[(hash >>> 0) % items.length];
}

export function neighbors(questions: QuestionSummary[], slug: string) {
  const index = questions.findIndex((question) => question.slug === slug);
  return {
    index,
    prev: index > 0 ? questions[index - 1] : null,
    next: index >= 0 && index < questions.length - 1 ? questions[index + 1] : null,
  };
}

export function pickRandom(questions: QuestionSummary[], exclude = new Set<string>()) {
  const pool = questions.filter((question) => !exclude.has(question.slug));
  const source = pool.length > 0 ? pool : questions;
  if (source.length === 0) return undefined;
  return source[Math.floor(Math.random() * source.length)];
}
