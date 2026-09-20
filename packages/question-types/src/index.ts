export type Difficulty = "easy" | "medium" | "hard";

/** Canonical tags used by the question bank. Validator rejects anything else. */
export const TAG_TAXONOMY = [
  "SELECT",
  "WHERE",
  "ORDER BY",
  "LIMIT",
  "DISTINCT",
  "aggregate",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "GROUP BY",
  "HAVING",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL OUTER JOIN",
  "CROSS JOIN",
  "self join",
  "subquery",
  "correlated subquery",
  "CTE",
  "recursive CTE",
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
  "UNION",
  "INTERSECT",
  "EXCEPT",
  "IS NULL",
  "COALESCE",
  "NULLIF",
  "CASE",
  "string functions",
  "date functions",
  "EXTRACT",
  "EXISTS",
  "IN",
  "BETWEEN",
  "LIKE",
  "top N per group",
  "gaps and islands",
  "conditional aggregation",
  "duplicate detection",
] as const;

export type QuestionTag = (typeof TAG_TAXONOMY)[number];

export interface TestCase {
  id: string;
  description: string;
  expected_row_count?: number;
  expected_columns?: string[];
  expected_rows?: Record<string, unknown>[];
  validate_order: boolean;
}

export interface Question {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  schema_sql: string;
  solution_sql: string;
  test_cases: TestCase[];
  hints: string[];
  explanation: string;
  companies?: string[];
  created_at: string;
}

export interface QuestionSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  companies?: string[];
}

export type SubmissionStatus = "pass" | "fail";

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface TestCaseResult {
  id: string;
  description: string;
  passed: boolean;
  message: string;
}

export interface ResultDiff {
  kind: "columns" | "row_count" | "values" | "order" | "error";
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface ValidationResult {
  passed: boolean;
  result: QueryResult;
  expected?: QueryResult;
  tests: TestCaseResult[];
  diff?: ResultDiff;
}

export type WorkerRequest =
  | { type: "INIT" }
  | {
      type: "RUN";
      schema_sql: string;
      user_sql: string;
      solution_sql?: string;
      test_cases: TestCase[];
    };

export type WorkerResponse =
  | { type: "READY" }
  | { type: "RESULT"; rows: Record<string, unknown>[]; columns: string[] }
  | { type: "PASS"; result: QueryResult; tests: TestCaseResult[] }
  | {
      type: "FAIL";
      result: QueryResult;
      tests: TestCaseResult[];
      diff: ResultDiff;
      expected?: QueryResult;
    }
  | { type: "ERROR"; message: string };
