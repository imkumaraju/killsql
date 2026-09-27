export type Difficulty = "easy" | "medium" | "hard";

/** Canonical tags used by the question bank. Validator rejects anything else. */
export const TAG_TAXONOMY = [
  // ── Core SELECT clauses ─────────────────────────────────────────────────────
  "SELECT",
  "WHERE",
  "ORDER BY",
  "LIMIT",
  "DISTINCT",
  "GROUP BY",
  "HAVING",
  "AS",
  "column alias",
  "table alias",
  "OFFSET",
  "FETCH FIRST",

  // ── Aggregates ───────────────────────────────────────────────────────────────
  "aggregate",
  "aggregates",
  "aggregation",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "COUNT DISTINCT",
  "STRING_AGG",
  "ARRAY_AGG",
  "PERCENTILE_CONT",
  "WITHIN GROUP",
  "ordered-set aggregate",
  "statistical aggregation",
  "STDDEV",
  "STDDEV_POP",
  "conditional aggregation",
  "weighted average",
  "median",
  "mode",

  // ── Joins ────────────────────────────────────────────────────────────────────
  "JOIN",
  "joins",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL OUTER JOIN",
  "CROSS JOIN",
  "CROSS JOIN LATERAL",
  "self join",
  "self-join",
  "anti-join",
  "multi-table join",
  "multi-table",
  "three-table join",
  "four-table join",
  "composite key",
  "multi-column join",
  "LATERAL",
  "derived table",
  "inline view",
  "relational division",

  // ── Filtering / logic ────────────────────────────────────────────────────────
  "filtering",
  "filter",
  "AND",
  "OR",
  "IN",
  "NOT IN",
  "BETWEEN",
  "LIKE",
  "NOT LIKE",
  "IS NULL",
  "IS NOT NULL",
  "NULL handling",
  "NULL check",
  "EXISTS",
  "NOT EXISTS",
  "REGEXP",
  "SIMILAR TO",
  "pattern matching",
  "threshold filter",
  "string validation",

  // ── Sorting / limiting ───────────────────────────────────────────────────────
  "sorting",
  "pagination",
  "limiting",

  // ── Subqueries / CTEs ────────────────────────────────────────────────────────
  "subquery",
  "correlated subquery",
  "scalar subquery",
  "CTE",
  "WITH",
  "recursive CTE",
  "WITH RECURSIVE",
  "FROM",

  // ── Window functions ─────────────────────────────────────────────────────────
  "window functions",
  "ROW_NUMBER",
  "RANK",
  "DENSE_RANK",
  "NTILE",
  "LAG",
  "LEAD",
  "FIRST_VALUE",
  "LAST_VALUE",
  "PERCENT_RANK",
  "CUME_DIST",
  "PARTITION BY",
  "ROWS BETWEEN",
  "RANGE BETWEEN",
  "UNBOUNDED PRECEDING",
  "WINDOW clause",
  "FILTER",
  "SUM OVER",
  "AVG OVER",
  "COUNT OVER",
  "MIN OVER",
  "MAX OVER",
  "running total",
  "moving average",
  "cumulative sum",

  // ── Set operations ───────────────────────────────────────────────────────────
  "UNION",
  "UNION ALL",
  "INTERSECT",
  "EXCEPT",
  "SET operations",

  // ── Conditional / CASE ───────────────────────────────────────────────────────
  "CASE",
  "CASE WHEN",
  "conditional logic",
  "COALESCE",
  "NULLIF",
  "IFNULL",
  "GREATEST",

  // ── Arithmetic / math ────────────────────────────────────────────────────────
  "arithmetic",
  "calculated column",
  "math functions",
  "ROUND",
  "CEIL",
  "FLOOR",
  "ABS",
  "MOD",
  "POWER",
  "SQRT",
  "division",
  "BIGINT",
  "CAST",

  // ── String functions ─────────────────────────────────────────────────────────
  "string functions",
  "LENGTH",
  "CHAR_LENGTH",
  "UPPER",
  "LOWER",
  "TRIM",
  "LTRIM",
  "RTRIM",
  "CONCAT",
  "SUBSTRING",
  "REPLACE",
  "LPAD",
  "RPAD",
  "REVERSE",
  "POSITION",
  "INSTR",
  "SPLIT_PART",
  "STRING_TO_ARRAY",
  "REGEXP",
  "string splitting",
  "string concatenation",

  // ── Date / time functions ────────────────────────────────────────────────────
  "date functions",
  "date",
  "EXTRACT",
  "HOUR",
  "CURRENT_DATE",
  "DATE_TRUNC",
  "DATEDIFF",
  "datediff",
  "INTERVAL",
  "interval",
  "AGE",
  "ISODOW",
  "GENERATE_SERIES",
  "generate_series",
  "date arithmetic",
  "interval arithmetic",
  "timestamp arithmetic",
  "timestamp functions",
  "date grouping",
  "date classification",
  "date filtering",
  "date ranges",
  "business days",
  "time analysis",

  // ── Array / JSON / semi-structured ───────────────────────────────────────────
  "array functions",
  "ARRAY_AGG",
  "UNNEST",
  "JSON",
  "JSON functions",
  "json_extract_string",
  "json_array_length",
  "semi-structured",

  // ── Pivot / reshape ──────────────────────────────────────────────────────────
  "PIVOT",
  "pivot",
  "UNPIVOT",
  "unpivot",
  "data reshaping",
  "data transformation",
  "normalization",

  // ── Analytics patterns ───────────────────────────────────────────────────────
  "top N per group",
  "TOP N per group",
  "gaps and islands",
  "gaps",
  "islands",
  "islands and gaps",
  "consecutive dates",
  "consecutive days",
  "streak",
  "duplicate detection",
  "duplicates",
  "deduplication",
  "data quality",
  "data cleaning",
  "data comparison",
  "data reconciliation",
  "period-over-period",
  "ranking",
  "sliding window",
  "rolling window",
  "buckets",
  "quartile",
  "ties",
  "partitioning",
  "percentage",
  "hierarchy",
  "tree traversal",
  "graph traversal",
  "BFS",
  "sequence",
  "sequence generation",
  "session analysis",
  "interval merging",
  "overlap detection",
  "booking conflicts",
  "seniority ranking",
  "history table",
  "event sweep",
  "interval algebra",
  "calendar",
  "pipeline",

  // ── Business / domain tags ───────────────────────────────────────────────────
  "analytics",
  "metrics",
  "statistics",
  "cohort",
  "cohort analysis",
  "retention",
  "DAU/MAU",
  "customer segmentation",
  "segmentation",
  "market basket analysis",
  "velocity metrics",
  "fraud detection",
  "anomaly detection",
  "z-score",
  "HR analytics",
  "financial analysis",
  "variance",
  "billing",
  "fiscal year",
  "marketing",
  "marketing analytics",
  "channel analysis",
  "inventory management",
  "supply chain",
  "demographics",
  "nearest match",
  "SLA",
  "funnel",
  "cumulative",
  "ABC analysis",
  "Pareto",
  "year-over-year",
  "growth rate",
  "revenue share",
  "revenue trend",
  "salary analysis",
  "salary classification",
  "salary percentile",
  "price tracking",
  "ratio",
  "one-time buyers",
  "repeat buyers",
  "recency",
  "reviews",
  "relational division",
  "histogram",
  "distribution",
  "frequency",
  "quota",
  "Cartesian product",
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
