"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
};

export function MonacoEditor({ value, onChange, onRun }: Props) {
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
      }}
      loading={<div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading editor…</div>}
    />
  );
}
