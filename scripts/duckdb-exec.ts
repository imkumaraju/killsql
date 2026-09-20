import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import type { QueryResult } from "../packages/question-types/src/index";
import { normalizeValue, splitSqlStatements } from "../apps/web/lib/validator";

async function withMemoryConnection<T>(fn: (connection: DuckDBConnection) => Promise<T>): Promise<T> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  try {
    return await fn(connection);
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
}

export async function executeSql(connection: DuckDBConnection, sql: string): Promise<QueryResult> {
  const statements = splitSqlStatements(sql);
  let last: QueryResult = { columns: [], rows: [], rowCount: 0 };
  for (const statement of statements) {
    const reader = await connection.runAndReadAll(statement);
    const columns = reader.columnNames();
    const rawRows = reader.getRowObjectsJson() as Record<string, unknown>[];
    const rows = rawRows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const column of columns) {
        out[column] = normalizeValue(row[column]);
      }
      return out;
    });
    last = { columns, rows, rowCount: rows.length };
  }
  return last;
}

export async function runQuestionSolution(schemaSql: string, solutionSql: string): Promise<QueryResult> {
  return withMemoryConnection(async (connection) => {
    await executeSql(connection, schemaSql);
    return executeSql(connection, solutionSql);
  });
}
