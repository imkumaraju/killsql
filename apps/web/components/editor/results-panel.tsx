"use client";

import type { QueryResult, ValidationResult } from "@killsql/question-types";
import { CheckCircle2, CircleX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function ResultTable({ result, empty }: { result?: QueryResult; empty: string }) {
  if (!result || result.columns.length === 0) {
    return <p className="px-4 py-6 text-sm text-zinc-500">{empty}</p>;
  }
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
          <tr>
            {result.columns.map((column) => (
              <th key={column} className="border-b border-zinc-800 px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, index) => (
            <tr key={index} className="odd:bg-zinc-950 even:bg-zinc-900/40">
              {result.columns.map((column) => (
                <td key={column} className="border-b border-zinc-800/80 px-3 py-1.5 font-mono text-zinc-200">
                  {formatCell(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ResultsPanel({
  running,
  error,
  validation,
}: {
  running: boolean;
  error: string | null;
  validation: ValidationResult | null;
}) {
  if (running) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Running in DuckDB…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-auto p-4">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!validation) {
    return (
      <p className="px-4 py-6 text-sm text-zinc-500">
        Write a query and press Run. Execution stays in your browser.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-1.5 border-b border-zinc-800 p-3">
        {validation.tests.map((test) => (
          <div key={test.id} className="flex items-start gap-2 text-sm">
            {test.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
            ) : (
              <CircleX className="mt-0.5 h-4 w-4 text-rose-400" />
            )}
            <div>
              <span className={cn(test.passed ? "text-zinc-200" : "text-rose-200")}>
                {test.description}
              </span>
              <p className="text-xs text-zinc-500">{test.message}</p>
            </div>
          </div>
        ))}
        {validation.diff && !validation.passed ? (
          <p className="pt-1 text-xs text-zinc-500">{validation.diff.message}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        <ResultTable result={validation.result} empty="Query returned no rows." />
      </div>
    </div>
  );
}
