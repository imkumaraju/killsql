import type { Difficulty, QuestionSummary } from "@killsql/question-types";

export type Track = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
};

export const TRACKS: Track[] = [
  {
    slug: "foundations",
    title: "Foundations",
    description: "SELECT, filter, sort, and limit — the queries every interview starts with.",
    tags: ["SELECT", "WHERE", "ORDER BY", "LIMIT", "DISTINCT"],
  },
  {
    slug: "aggregates",
    title: "Aggregates",
    description: "GROUP BY, HAVING, and summary functions.",
    tags: ["aggregate", "COUNT", "SUM", "AVG", "MIN", "MAX", "GROUP BY", "HAVING", "conditional aggregation"],
  },
  {
    slug: "joins",
    title: "Joins",
    description: "Combine rows across tables, including self-joins.",
    tags: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "CROSS JOIN", "self join"],
  },
  {
    slug: "subqueries-ctes",
    title: "Subqueries and CTEs",
    description: "Nested queries, EXISTS, and WITH clauses — including recursive CTEs.",
    tags: ["subquery", "correlated subquery", "CTE", "recursive CTE", "EXISTS", "IN"],
  },
  {
    slug: "window-functions",
    title: "Window functions",
    description: "RANK, LAG, running totals, and top-N per group.",
    tags: [
      "window functions",
      "ROW_NUMBER",
      "RANK",
      "DENSE_RANK",
      "NTILE",
      "LAG",
      "LEAD",
      "FIRST_VALUE",
      "LAST_VALUE",
      "running total",
      "top N per group",
    ],
  },
  {
    slug: "nulls-case",
    title: "NULLs and CASE",
    description: "Missing values, COALESCE, and conditional labels.",
    tags: ["IS NULL", "COALESCE", "NULLIF", "CASE"],
  },
  {
    slug: "strings-dates",
    title: "Strings and dates",
    description: "LIKE, EXTRACT, and everyday text/date helpers.",
    tags: ["string functions", "date functions", "EXTRACT", "LIKE", "BETWEEN"],
  },
  {
    slug: "set-ops",
    title: "Set operations",
    description: "UNION, INTERSECT, and EXCEPT.",
    tags: ["UNION", "INTERSECT", "EXCEPT"],
  },
  {
    slug: "patterns",
    title: "Interview patterns",
    description: "Gaps and islands, duplicates, and other classics.",
    tags: ["gaps and islands", "duplicate detection", "top N per group"],
  },
];

const difficultyRank: Record<Difficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

export function getTrack(slug: string) {
  return TRACKS.find((track) => track.slug === slug) ?? null;
}

export function questionsForTrack(questions: QuestionSummary[], track: Track) {
  const tags = new Set(track.tags);
  return questions
    .filter((question) => {
      if (!question.tags.some((tag) => tags.has(tag))) return false;
      if (track.slug === "foundations") return question.difficulty === "easy";
      return true;
    })
    .sort((a, b) => {
      const diff = difficultyRank[a.difficulty] - difficultyRank[b.difficulty];
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
}
