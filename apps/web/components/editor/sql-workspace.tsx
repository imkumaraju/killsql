"use client";

import type { Question, QuestionSummary, ValidationResult } from "@killsql/question-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Lightbulb, Play, RotateCcw, Shuffle } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDonatePrompt } from "@/components/donate/donate-prompt";
import { isDonateHiddenToday } from "@/lib/donate";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { MarkdownBody } from "@/components/markdown";
import { ResultsPanel } from "@/components/editor/results-panel";
import { SchemaPreview } from "@/components/editor/schema-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { neighbors, pickRandom } from "@/lib/daily";
import { mergeSolved, useProgressStore } from "@/lib/local-progress";
import { parseSchemaSql } from "@/lib/schema-sql";
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

export function SqlWorkspace({
  question,
  questions,
}: {
  question: Question;
  questions: QuestionSummary[];
}) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const sql = useWorkspaceStore((state) => state.drafts[question.slug] ?? STARTER);
  const setDraft = useWorkspaceStore((state) => state.setDraft);
  const setSql = (value: string) => setDraft(question.slug, value);
  const markVisited = useProgressStore((state) => state.markVisited);
  const markSolved = useProgressStore((state) => state.markSolved);
  const recordAttempt = useProgressStore((state) => state.recordAttempt);
  const localSolved = useProgressStore((state) => state.solved);
  const attempts = useProgressStore((state) => state.attempts[question.slug] ?? []);
  const solved = mergeSolved(user?.solved_slugs, localSolved);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [runNonce, setRunNonce] = useState(0);
  const passedThisSession = useRef(false);
  const openDonatePrompt = useDonatePrompt((state) => state.openPrompt);
  const tables = useMemo(() => parseSchemaSql(question.schema_sql), [question.schema_sql]);
  const { prev, next } = neighbors(questions, question.slug);

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

  useEffect(() => {
    markVisited(question.slug);
  }, [question.slug, markVisited]);

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
      setRunNonce((value) => value + 1);
      recordAttempt(question.slug, {
        status: result.passed ? "pass" : "fail",
        sql,
      });
      if (result.passed) {
        markSolved(question.slug);
        if (!passedThisSession.current) {
          passedThisSession.current = true;
          if (!isDonateHiddenToday()) {
            openDonatePrompt();
          }
        }
      }
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
  }, [question, sql, user, saveSubmission, openDonatePrompt, markSolved, recordAttempt]);

  function goRandom() {
    const pick = pickRandom(questions, solved);
    if (pick) router.push(`/problems/${pick.slug}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/problems" className="shrink-0 text-zinc-500 hover:text-zinc-200">
            Problems
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="truncate text-zinc-200">
            {question.id}. {question.title}
          </span>
          {solved.has(question.slug) ? (
            <Badge variant="easy" className="shrink-0">
              Solved
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {prev ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/problems/${prev.slug}`}>
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" disabled>
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
          )}
          {next ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/problems/${next.slug}`}>
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" disabled>
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={goRandom}>
            <Shuffle className="h-3.5 w-3.5" />
            Random
          </Button>
        </div>
      </div>
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
                  {question.companies?.map((company) => (
                    <Badge key={company} variant="lime">
                      {company}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Queries run in <span className="text-zinc-300">DuckDB</span> in your browser. Syntax is
                  close to Postgres; some MySQL/SQL Server functions will not work here.
                </p>
              </div>
              <MarkdownBody content={question.description} />
              <SchemaPreview tables={tables} rawSql={question.schema_sql} />
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
              {attempts.length > 0 ? (
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-zinc-200">Your attempts</h2>
                  <ul className="space-y-2">
                    {attempts.map((attempt) => (
                      <li
                        key={`${attempt.at}-${attempt.status}`}
                        className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={attempt.status === "pass" ? "text-emerald-300" : "text-rose-300"}>
                            {attempt.status}
                          </span>
                          <span>{new Date(attempt.at).toLocaleString()}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSql(attempt.sql)}
                          className="mt-1 text-left font-mono text-zinc-300 hover:text-lime-300"
                        >
                          Restore this query
                        </button>
                      </li>
                    ))}
                  </ul>
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
                    SQL editor · DuckDB
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
                  <MonacoEditor value={sql} onChange={setSql} onRun={() => void run()} tables={tables} />
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
                  <ResultsPanel key={runNonce} running={running} error={error} validation={validation} />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
