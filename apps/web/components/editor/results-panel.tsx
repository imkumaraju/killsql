"use client";

import { useMemo, useState } from "react";
import type { QueryResult, ValidationResult } from "@killsql/question-types";
import { CheckCircle2, CircleX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { firstMismatch, mismatchedCells } from "@/lib/result-compare";

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ResultTable({
  result,
  empty,
  highlight,
}: {
  result?: QueryResult;
  empty: string;
  highlight?: { row: number; columns: Set<string> };
}) {
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
              {result.columns.map((column) => {
                const marked = highlight?.row === index && highlight.columns.has(column.toLowerCase());
                return (
                  <td
                    key={column}
                    className={cn(
                      "border-b border-zinc-800/80 px-3 py-1.5 font-mono text-zinc-200",
                      marked && "bg-rose-500/20 text-rose-100",
                    )}
                  >
                    {formatCell(row[column])}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Tab = "output" | "expected" | "diff";

export function ResultsPanel({
  running,
  error,
  validation,
}: {
  running: boolean;
  error: string | null;
  validation: ValidationResult | null;
}) {
  const [tab, setTab] = useState<Tab>(
    validation && !validation.passed && validation.expected ? "diff" : "output",
  );

  const ordered = validation?.diff?.kind === "order";
  const mismatch = useMemo(() => {
    if (!validation?.expected || validation.passed) return null;
    return firstMismatch(validation.result, validation.expected, Boolean(ordered));
  }, [validation, ordered]);

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
        Write a query and press Run. DuckDB executes it in your browser.
      </p>
    );
  }

  const failedHighlight =
    mismatch && tab === "output"
      ? {
          row: mismatch.row,
          columns: mismatchedCells(
            validation.result.rows[mismatch.row],
            validation.expected?.rows[mismatch.row],
            validation.expected?.columns ?? validation.result.columns,
          ),
        }
      : undefined;

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
        {mismatch && !validation.passed ? (
          <p className="pt-1 text-xs text-amber-200/90">
            First difference at row {mismatch.row + 1}, column{" "}
            <span className="font-mono">{mismatch.column}</span>: expected{" "}
            <span className="font-mono text-emerald-300">{formatCell(mismatch.expected)}</span>, got{" "}
            <span className="font-mono text-rose-300">{formatCell(mismatch.actual)}</span>
          </p>
        ) : validation.diff && !validation.passed ? (
          <p className="pt-1 text-xs text-zinc-500">{validation.diff.message}</p>
        ) : null}
      </div>
      {validation.expected && !validation.passed ? (
        <div className="flex gap-1 border-b border-zinc-800 px-3 py-1.5 text-xs">
          {(["output", "expected", "diff"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "rounded-md px-2 py-1 capitalize",
                tab === item ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              {item === "output" ? "Yours" : item === "expected" ? "Expected" : "Diff"}
            </button>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        {tab === "expected" ? (
          <ResultTable result={validation.expected} empty="No expected rows." />
        ) : tab === "diff" && validation.expected ? (
          <div className="grid h-full min-h-0 grid-cols-1 divide-y divide-zinc-800 overflow-auto lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div>
              <p className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-zinc-500">Yours</p>
              <ResultTable
                result={validation.result}
                empty="Query returned no rows."
                highlight={
                  mismatch
                    ? {
                        row: mismatch.row,
                        columns: mismatchedCells(
                          validation.result.rows[mismatch.row],
                          validation.expected.rows[mismatch.row],
                          validation.expected.columns,
                        ),
                      }
                    : undefined
                }
              />
            </div>
            <div>
              <p className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-zinc-500">Expected</p>
              <ResultTable
                result={validation.expected}
                empty="No expected rows."
                highlight={
                  mismatch
                    ? {
                        row: mismatch.row,
                        columns: new Set([mismatch.column.toLowerCase()]),
                      }
                    : undefined
                }
              />
            </div>
          </div>
        ) : (
          <ResultTable
            result={validation.result}
            empty="Query returned no rows."
            highlight={failedHighlight}
          />
        )}
      </div>
    </div>
  );
}
