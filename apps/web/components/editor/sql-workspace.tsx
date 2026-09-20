"use client";

import type { Question, ValidationResult } from "@killsql/question-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Play, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { MarkdownBody } from "@/components/markdown";
import { ResultsPanel } from "@/components/editor/results-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSqlEngine } from "@/lib/sql-engine";
import { useWorkspaceStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/use-user";

const MonacoEditor = dynamic(
  () => import("@/components/editor/monaco-editor").then((mod) => mod.MonacoEditor),
  { ssr: false },
);

const STARTER = `-- Write your SQL here, then press Ctrl/Cmd+Enter
`;

const difficultyVariant = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
} as const;

export function SqlWorkspace({ question }: { question: Question }) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const sql = useWorkspaceStore((state) => state.drafts[question.slug] ?? STARTER);
  const setDraft = useWorkspaceStore((state) => state.setDraft);
  const setSql = (value: string) => setDraft(question.slug, value);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const saveSubmission = useMutation({
    mutationFn: async (payload: { status: "pass" | "fail"; sql_written: string }) => {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_slug: question.slug,
          difficulty: question.difficulty,
          ...payload,
        }),
      });
      if (response.status === 401) return;
      if (!response.ok) throw new Error("Could not save submission");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
      void queryClient.invalidateQueries({ queryKey: ["active-streak"] });
    },
  });

  useEffect(() => {
    void getSqlEngine().init();
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await getSqlEngine().run({
        schema_sql: question.schema_sql,
        user_sql: sql,
        solution_sql: question.solution_sql,
        test_cases: question.test_cases,
      });
      setValidation(result);
      if (user) {
        saveSubmission.mutate({
          status: result.passed ? "pass" : "fail",
          sql_written: sql,
        });
      }
    } catch (err) {
      setValidation(null);
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setRunning(false);
    }
  }, [question, sql, user, saveSubmission]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelGroup direction="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize={42} minSize={28} className="min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-5 p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-zinc-50">{question.title}</h1>
                  <Badge variant={difficultyVariant[question.difficulty]}>{question.difficulty}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {question.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </div>
              <MarkdownBody content={question.description} />
              <div>
                <h2 className="mb-2 text-sm font-semibold text-zinc-200">Schema</h2>
                <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                  {question.schema_sql.replaceAll("; ", ";\n")}
                </pre>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHintsShown((count) => Math.min(question.hints.length, count + 1))}
                >
                  <Lightbulb className="h-4 w-4" />
                  Hint {hintsShown}/{question.hints.length}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSolution((value) => !value)}>
                  {showSolution ? "Hide solution" : "Show solution"}
                </Button>
              </div>
              {question.hints.slice(0, hintsShown).map((hint, index) => (
                <p key={hint} className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-100">
                  Hint {index + 1}: {hint}
                </p>
              ))}
              {showSolution ? (
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-zinc-200">Official solution</h2>
                  <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-lime-200">
                    {question.solution_sql}
                  </pre>
                  <MarkdownBody className="mt-3" content={question.explanation} />
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </Panel>
        <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-lime-400/60" />
        <Panel defaultSize={58} minSize={35} className="min-h-0">
          <PanelGroup direction="vertical">
            <Panel defaultSize={62} minSize={30}>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    SQL editor
                  </span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setSql(STARTER)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                    <Button size="sm" onClick={() => void run()} disabled={running}>
                      <Play className="h-3.5 w-3.5" />
                      Run
                    </Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <MonacoEditor value={sql} onChange={setSql} onRun={() => void run()} />
                </div>
              </div>
            </Panel>
            <PanelResizeHandle className="h-1 bg-zinc-800 hover:bg-lime-400/60" />
            <Panel defaultSize={38} minSize={20}>
              <div className="flex h-full flex-col">
                <div className="border-b border-zinc-800 px-3 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Results
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <ResultsPanel running={running} error={error} validation={validation} />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
