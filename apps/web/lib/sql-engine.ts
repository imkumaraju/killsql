import type {
  QueryResult,
  TestCase,
  ValidationResult,
  WorkerRequest,
  WorkerResponse,
} from "@killsql/question-types";
import { resetAndQuery } from "./execute";
import { validateResult } from "./validator";

type RunArgs = {
  schema_sql: string;
  user_sql: string;
  solution_sql?: string;
  test_cases: TestCase[];
};

type DuckDbModule = typeof import("@duckdb/duckdb-wasm");

let fallbackDb: import("@duckdb/duckdb-wasm").AsyncDuckDB | null = null;
let fallbackLoading: Promise<import("@duckdb/duckdb-wasm").AsyncDuckDB> | null = null;

async function initFallbackDb() {
  if (fallbackDb) return fallbackDb;
  if (!fallbackLoading) {
    fallbackLoading = (async () => {
      const duckdb: DuckDbModule = await import("@duckdb/duckdb-wasm");
      const bundles = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(bundles);
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], {
          type: "text/javascript",
        }),
      );
      const worker = new Worker(workerUrl);
      const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(workerUrl);
      fallbackDb = db;
      return db;
    })();
  }
  return fallbackLoading;
}

async function dropUserTables(
  conn: import("@duckdb/duckdb-wasm").AsyncDuckDBConnection,
) {
  const table = await conn.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE'`,
  );
  const names = table.toArray().map((row) => String(row.table_name));
  for (const name of names) {
    await conn.query(`DROP TABLE IF EXISTS "${name.replaceAll('"', '""')}" CASCADE`);
  }
}

async function runOnFallback(schemaSql: string, querySql: string): Promise<QueryResult> {
  const db = await initFallbackDb();
  const conn = await db.connect();
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

async function runFallback(args: RunArgs): Promise<ValidationResult> {
  const actual = await runOnFallback(args.schema_sql, args.user_sql);
  const expected = args.solution_sql
    ? await runOnFallback(args.schema_sql, args.solution_sql)
    : undefined;
  return validateResult(actual, args.test_cases, expected);
}

function workerUrl() {
  return new URL("../worker/sql.worker.ts", import.meta.url);
}

export class SqlEngine {
  private worker: Worker | null = null;
  private ready: Promise<void>;
  private useFallback = false;
  private seq = 0;
  private pending = new Map<
    number,
    { resolve: (value: WorkerResponse) => void; reject: (error: Error) => void }
  >();

  constructor() {
    this.ready = this.start();
  }

  private async start() {
    if (typeof window === "undefined") return;
    try {
      this.worker = new Worker(workerUrl(), { type: "module" });
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const first = this.pending.entries().next().value;
        if (!first) return;
        const [id, waiter] = first;
        this.pending.delete(id);
        waiter.resolve(event.data);
      };
      this.worker.onerror = () => {
        this.useFallback = true;
      };
      const ready = await this.send({ type: "INIT" }, 30000);
      if (ready.type !== "READY") {
        this.useFallback = true;
      }
    } catch {
      this.useFallback = true;
      this.worker = null;
    }
  }

  private send(request: WorkerRequest, timeoutMs = 20000): Promise<WorkerResponse> {
    const worker = this.worker;
    if (!worker) {
      return Promise.reject(new Error("Worker unavailable"));
    }
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("SQL worker timed out"));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          window.clearTimeout(timer);
          resolve(value);
        },
        reject,
      });
      worker.postMessage(request);
    });
  }

  async init() {
    await this.ready;
    if (this.useFallback) {
      await initFallbackDb();
    }
  }

  async run(args: RunArgs): Promise<ValidationResult> {
    await this.init();
    if (!this.useFallback && this.worker) {
      try {
        const response = await this.send({ type: "RUN", ...args });
        if (response.type === "PASS") {
          return { passed: true, result: response.result, tests: response.tests };
        }
        if (response.type === "FAIL") {
          return {
            passed: false,
            result: response.result,
            tests: response.tests,
            diff: response.diff,
            expected: response.expected,
          };
        }
        if (response.type === "ERROR") {
          throw new Error(response.message);
        }
      } catch {
        this.useFallback = true;
      }
    }
    return runFallback(args);
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}

let engine: SqlEngine | null = null;

export function getSqlEngine() {
  if (!engine) engine = new SqlEngine();
  return engine;
}
