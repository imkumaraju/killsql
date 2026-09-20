/// <reference lib="webworker" />

import * as duckdb from "@duckdb/duckdb-wasm";
import type { WorkerRequest, WorkerResponse } from "@killsql/question-types";
import { resetAndQuery } from "../lib/execute";
import { validateResult } from "../lib/validator";

let db: duckdb.AsyncDuckDB | null = null;

async function getDb() {
  if (db) return db;
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    }),
  );
  const worker = new Worker(workerUrl);
  const instance = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
  await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  db = instance;
  return instance;
}

async function dropUserTables(conn: duckdb.AsyncDuckDBConnection) {
  const table = await conn.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE'`,
  );
  const names = table.toArray().map((row) => String(row.table_name));
  for (const name of names) {
    await conn.query(`DROP TABLE IF EXISTS "${name.replaceAll('"', '""')}" CASCADE`);
  }
}

async function runQuery(schemaSql: string, querySql: string) {
  const database = await getDb();
  const conn = await database.connect();
  try {
    return await resetAndQuery(
      (sql) => conn.query(sql),
      () => dropUserTables(conn),
      schemaSql,
      querySql,
    );
  } finally {
    await conn.close();
  }
}

function reply(message: WorkerResponse) {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;
  try {
    if (payload.type === "INIT") {
      await getDb();
      reply({ type: "READY" });
      return;
    }
    if (payload.type === "RUN") {
      const actual = await runQuery(payload.schema_sql, payload.user_sql);
      const expected = payload.solution_sql
        ? await runQuery(payload.schema_sql, payload.solution_sql)
        : undefined;
      const validation = validateResult(actual, payload.test_cases, expected);
      if (validation.passed) {
        reply({ type: "PASS", result: validation.result, tests: validation.tests });
      } else {
        reply({
          type: "FAIL",
          result: validation.result,
          tests: validation.tests,
          diff: validation.diff ?? {
            kind: "values",
            message: "Query did not pass the test cases.",
          },
          expected: validation.expected,
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    reply({ type: "ERROR", message });
  }
};
