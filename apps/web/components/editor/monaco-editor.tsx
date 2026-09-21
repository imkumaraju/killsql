"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef } from "react";
import type { SchemaTable } from "@/lib/schema-sql";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  tables?: SchemaTable[];
};

export function MonacoEditor({ value, onChange, onRun, tables = [] }: Props) {
  const tablesRef = useRef(tables);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      monaco.editor.defineTheme("killsql-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6b7280", fontStyle: "italic" },
          { token: "keyword", foreground: "d9f99d" },
          { token: "string", foreground: "fdba74" },
          { token: "number", foreground: "7dd3fc" },
        ],
        colors: {
          "editor.background": "#09090b",
          "editor.foreground": "#e4e4e7",
          "editorLineNumber.foreground": "#3f3f46",
          "editorCursor.foreground": "#bef264",
          "editor.selectionBackground": "#3f6218aa",
          "editor.lineHighlightBackground": "#18181b",
        },
      });
      monaco.editor.setTheme("killsql-dark");
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRun?.();
      });

      const disposable = monaco.languages.registerCompletionItemProvider("sql", {
        triggerCharacters: [".", " ", ","],
        provideCompletionItems(model, position) {
          const schema = tablesRef.current;
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
          const tableDot = line.match(/([A-Za-z_][\w]*)\s*\.\s*$/);
          const fromTable = tableDot
            ? schema.find((table) => table.name.toLowerCase() === tableDot[1].toLowerCase())
            : undefined;

          const suggestions: import("monaco-editor").languages.CompletionItem[] = [];
          if (fromTable) {
            for (const column of fromTable.columns) {
              suggestions.push({
                label: column.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: column.name,
                detail: `${fromTable.name}.${column.name} ${column.type}`,
                range,
              });
            }
            return { suggestions };
          }

          for (const table of schema) {
            suggestions.push({
              label: table.name,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: table.name,
              detail: "table",
              range,
            });
            for (const column of table.columns) {
              suggestions.push({
                label: `${table.name}.${column.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: `${table.name}.${column.name}`,
                detail: column.type,
                range,
              });
              suggestions.push({
                label: column.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: column.name,
                detail: `${table.name}.${column.name}`,
                range,
              });
            }
          }
          return { suggestions };
        },
      });

      editor.onDidDispose(() => disposable.dispose());
    },
    [onRun],
  );

  return (
    <Editor
      height="100%"
      defaultLanguage="sql"
      theme="killsql-dark"
      value={value}
      onChange={(next) => onChange(next ?? "")}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        fontLigatures: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        quickSuggestions: { other: true, comments: false, strings: false },
      }}
      loading={<div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading editor…</div>}
    />
  );
}
