"use client";

import { useState } from "react";
import type { SchemaTable } from "@/lib/schema-sql";
import { cn } from "@/lib/utils";

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function SchemaPreview({
  tables,
  rawSql,
}: {
  tables: SchemaTable[];
  rawSql: string;
}) {
  const [showSql, setShowSql] = useState(tables.length === 0);

  if (showSql || tables.length === 0) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Schema</h2>
          {tables.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowSql(false)}
              className="text-xs text-zinc-500 hover:text-lime-300"
            >
              Show tables
            </button>
          ) : null}
        </div>
        <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
          {rawSql.replaceAll("; ", ";\n")}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Schema</h2>
        <button
          type="button"
          onClick={() => setShowSql(true)}
          className="text-xs text-zinc-500 hover:text-lime-300"
        >
          View SQL
        </button>
      </div>
      {tables.map((table) => (
        <div key={table.name} className="overflow-hidden rounded-lg border border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <p className="font-mono text-sm text-zinc-100">{table.name}</p>
            <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-zinc-500">
              {table.columns.map((column) => (
                <span key={column.name} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-300">
                  {column.name}
                  <span className="text-zinc-500"> {column.type}</span>
                </span>
              ))}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-zinc-500">
                <tr>
                  {table.columns.map((column) => (
                    <th key={column.name} className="px-3 py-1.5 font-medium">
                      {column.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={index} className="odd:bg-zinc-950 even:bg-zinc-900/40">
                    {table.columns.map((column) => (
                      <td
                        key={column.name}
                        className={cn(
                          "px-3 py-1 font-mono",
                          row[column.name] === null ? "text-zinc-600" : "text-zinc-200",
                        )}
                      >
                        {formatCell(row[column.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {table.rows.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-500">No sample rows.</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
