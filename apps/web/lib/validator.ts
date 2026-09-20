import type {
  QueryResult,
  ResultDiff,
  TestCase,
  TestCaseResult,
  ValidationResult,
} from "@killsql/question-types";

function normalizeDateTime(value: string): string {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}:\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/);
  if (!match) return value;
  const [, date, time] = match;
  if (!time || time === "00:00:00") return date;
  return `${date} ${time}`;
}

export function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") {
    if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) {
      return Number(value);
    }
    return value.toString();
  }
  if (typeof value === "number") {
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "boolean") return value;
  if (value instanceof Date) return normalizeDateTime(value.toISOString());
  if (typeof value === "string") {
    const dated = normalizeDateTime(value);
    if (dated !== value) return dated;
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      const asNumber = Number(value);
      if (!Number.isNaN(asNumber)) return asNumber;
    }
    return value;
  }
  if (typeof value === "object") {
    const maybe = value as { toISOString?: () => string; toString?: () => string };
    if (typeof maybe.toISOString === "function") {
      try {
        return normalizeDateTime(maybe.toISOString());
      } catch {
        /* ignore */
      }
    }
    if (typeof maybe.toString === "function") {
      const text = maybe.toString();
      if (text === "[object Object]") return JSON.stringify(value);
      const dated = normalizeDateTime(text);
      if (dated !== text) return dated;
      if (text !== "" && !Number.isNaN(Number(text)) && /^-?\d+(\.\d+)?$/.test(text)) {
        return Number(text);
      }
      return text;
    }
  }
  return value;
}

export function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.split("\n").every((line) => line.trim().startsWith("--")));
}

function canonicalRow(
  row: Record<string, unknown>,
  columns?: string[],
): string {
  const keys = (columns ?? Object.keys(row)).map((key) => key.toLowerCase());
  const lookup = new Map(Object.keys(row).map((key) => [key.toLowerCase(), key]));
  const normalized: Record<string, unknown> = {};
  for (const key of [...keys].sort()) {
    const original = lookup.get(key);
    normalized[key] = original ? normalizeValue(row[original]) : null;
  }
  return JSON.stringify(normalized);
}

function lowerSet(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase()));
}

function missingColumns(actual: string[], expected: string[]): string[] {
  const have = lowerSet(actual);
  return expected.filter((column) => !have.has(column.toLowerCase()));
}

function compareRows(
  actual: Record<string, unknown>[],
  expected: Record<string, unknown>[],
  columns: string[] | undefined,
  validateOrder: boolean,
): ResultDiff | undefined {
  const actualKeys = actual.map((row) => canonicalRow(row, columns));
  const expectedKeys = expected.map((row) => canonicalRow(row, columns));

  if (validateOrder) {
    for (let i = 0; i < expectedKeys.length; i += 1) {
      if (actualKeys[i] !== expectedKeys[i]) {
        return {
          kind: "order",
          message: `Row ${i + 1} does not match the expected ordered result.`,
          expected: expected[i],
          actual: actual[i] ?? null,
        };
      }
    }
    return undefined;
  }

  const remaining = [...actualKeys];
  for (const key of expectedKeys) {
    const index = remaining.indexOf(key);
    if (index === -1) {
      return {
        kind: "values",
        message: "Result rows do not match the expected set.",
        expected,
        actual,
      };
    }
    remaining.splice(index, 1);
  }
  if (remaining.length > 0) {
    return {
      kind: "values",
      message: "Result contains extra rows that were not expected.",
      expected,
      actual,
    };
  }
  return undefined;
}

export function validateResult(
  actual: QueryResult,
  testCases: TestCase[],
  expectedFromSolution?: QueryResult,
): ValidationResult {
  const tests: TestCaseResult[] = [];
  let diff: ResultDiff | undefined;

  for (const test of testCases) {
    const expectedRows = test.expected_rows ?? expectedFromSolution?.rows;
    const expectedColumns =
      test.expected_columns ??
      (expectedRows && expectedRows[0] ? Object.keys(expectedRows[0]) : expectedFromSolution?.columns);

    if (expectedColumns && expectedColumns.length > 0) {
      const missing = missingColumns(actual.columns, expectedColumns);
      if (missing.length > 0) {
        const message = `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`;
        tests.push({ id: test.id, description: test.description, passed: false, message });
        diff ??= { kind: "columns", message, expected: expectedColumns, actual: actual.columns };
        continue;
      }
    }

    const expectedCount = test.expected_row_count ?? expectedRows?.length;
    if (expectedCount !== undefined && actual.rowCount !== expectedCount) {
      const message = `Expected ${expectedCount} row${expectedCount === 1 ? "" : "s"}, got ${actual.rowCount}`;
      tests.push({ id: test.id, description: test.description, passed: false, message });
      diff ??= {
        kind: "row_count",
        message,
        expected: expectedCount,
        actual: actual.rowCount,
      };
      continue;
    }

    if (expectedRows) {
      const rowDiff = compareRows(
        actual.rows,
        expectedRows,
        expectedColumns,
        test.validate_order,
      );
      if (rowDiff) {
        tests.push({
          id: test.id,
          description: test.description,
          passed: false,
          message: rowDiff.message,
        });
        diff ??= rowDiff;
        continue;
      }
    }

    tests.push({
      id: test.id,
      description: test.description,
      passed: true,
      message: "Passed",
    });
  }

  const passed = tests.length > 0 && tests.every((test) => test.passed);
  return {
    passed,
    result: actual,
    expected: expectedFromSolution,
    tests,
    diff,
  };
}
