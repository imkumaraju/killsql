import { runQuestionSolution } from "./duckdb-exec";
import { loadAllQuestions } from "./questions-fs";

async function main() {
  const ids = new Set(process.argv.slice(2));
  const questions = loadAllQuestions().filter((q) => ids.size === 0 || ids.has(q.id));

  for (const q of questions) {
    try {
      const result = await runQuestionSolution(q.schema_sql, q.solution_sql);
      console.log(`\n=== ${q.id} ${q.slug} ===`);
      console.log(JSON.stringify({ columns: result.columns, rowCount: result.rowCount, rows: result.rows }, null, 2));
    } catch (cause) {
      console.error(`\n=== ${q.id} ${q.slug} FAILED ===`);
      console.error(cause);
    }
  }
}

main();

