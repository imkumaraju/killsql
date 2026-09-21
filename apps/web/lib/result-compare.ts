import type { QueryResult } from "@killsql/question-types";
import { normalizeValue } from "./validator";

export type CellMismatch = {
  row: number;
  column: string;
  expected: unknown;
  actual: unknown;
};

function lookup(row: Record<string, unknown>, column: string) {
  if (column in row) return row[column];
  const match = Object.keys(row).find((key) => key.toLowerCase() === column.toLowerCase());
  return match ? row[match] : undefined;
}

export function firstMismatch(
  actual: QueryResult,
  expected: QueryResult,
  ordered: boolean,
): CellMismatch | null {
  const columns = expected.columns.length > 0 ? expected.columns : actual.columns;
  const expectedKeys = expected.rows.map((row) =>
    columns.map((column) => JSON.stringify(normalizeValue(lookup(row, column)))),
  );
  const actualKeys = actual.rows.map((row) =>
    columns.map((column) => JSON.stringify(normalizeValue(lookup(row, column)))),
  );

  if (ordered) {
    const length = Math.max(expected.rows.length, actual.rows.length);
    for (let row = 0; row < length; row += 1) {
      const expectedRow = expectedKeys[row];
      const actualRow = actualKeys[row];
      if (!expectedRow || !actualRow) {
        return {
          row,
          column: columns[0] ?? "(row)",
          expected: expected.rows[row] ?? null,
          actual: actual.rows[row] ?? null,
        };
      }
      for (let col = 0; col < columns.length; col += 1) {
        if (expectedRow[col] !== actualRow[col]) {
          return {
            row,
            column: columns[col] ?? `col ${col}`,
            expected: lookup(expected.rows[row] ?? {}, columns[col] ?? ""),
            actual: lookup(actual.rows[row] ?? {}, columns[col] ?? ""),
          };
        }
      }
    }
    return null;
  }

  const remaining = actualKeys.map((key, index) => ({ key: key.join("|"), index }));
  for (let row = 0; row < expectedKeys.length; row += 1) {
    const want = expectedKeys[row].join("|");
    const found = remaining.findIndex((item) => item.key === want);
    if (found === -1) {
      const actualRow = actual.rows[row] ?? actual.rows[0];
      for (const column of columns) {
        const expectedValue = lookup(expected.rows[row] ?? {}, column);
        const actualValue = lookup(actualRow ?? {}, column);
        if (JSON.stringify(normalizeValue(expectedValue)) !== JSON.stringify(normalizeValue(actualValue))) {
          return { row, column, expected: expectedValue, actual: actualValue ?? null };
        }
      }
      return {
        row,
        column: columns[0] ?? "(row)",
        expected: expected.rows[row],
        actual: actualRow ?? null,
      };
    }
    remaining.splice(found, 1);
  }
  if (remaining.length > 0) {
    const extra = remaining[0];
    return {
      row: extra.index,
      column: columns[0] ?? "(row)",
      expected: null,
      actual: actual.rows[extra.index] ?? null,
    };
  }
  return null;
}

export function mismatchedCells(
  actualRow: Record<string, unknown> | undefined,
  expectedRow: Record<string, unknown> | undefined,
  columns: string[],
) {
  const set = new Set<string>();
  for (const column of columns) {
    const expectedValue = expectedRow ? lookup(expectedRow, column) : undefined;
    const actualValue = actualRow ? lookup(actualRow, column) : undefined;
    if (JSON.stringify(normalizeValue(expectedValue)) !== JSON.stringify(normalizeValue(actualValue))) {
      set.add(column.toLowerCase());
    }
  }
  return set;
}
