import type { QueryResult } from "@killsql/question-types";
import { normalizeValue, splitSqlStatements } from "./validator";

type ArrowLike = {
  schema: { fields: { name: string }[] };
  numRows: number;
  toArray: () => Record<string, unknown>[];
};

export type SqlRunner = (sql: string) => Promise<ArrowLike>;

export function arrowToResult(table: ArrowLike): QueryResult {
  const columns = table.schema.fields.map((field) => field.name);
  const rows = table.toArray().map((row) => {
    const out: Record<string, unknown> = {};
    for (const column of columns) {
      out[column] = normalizeValue(row[column]);
    }
    return out;
  });
  return { columns, rows, rowCount: rows.length };
}

export async function runStatements(run: SqlRunner, sql: string): Promise<QueryResult | null> {
  const statements = splitSqlStatements(sql);
  let last: QueryResult | null = null;
  for (const statement of statements) {
    const table = await run(statement);
    last = arrowToResult(table);
  }
  return last;
}

export async function resetAndQuery(
  run: SqlRunner,
  dropTables: () => Promise<void>,
  schemaSql: string,
  querySql: string,
): Promise<QueryResult> {
  await dropTables();
  await runStatements(run, schemaSql);
  const result = await runStatements(run, querySql);
  if (!result) {
    return { columns: [], rows: [], rowCount: 0 };
  }
  return result;
}
