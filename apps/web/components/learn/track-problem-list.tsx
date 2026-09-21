"use client";

import type { QuestionSummary } from "@killsql/question-types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { mergeSolved, useProgressStore } from "@/lib/local-progress";
import { useHydrated } from "@/lib/use-hydrated";
import { useCurrentUser } from "@/lib/use-user";

export function TrackProblemList({ questions }: { questions: QuestionSummary[] }) {
  const { data: user } = useCurrentUser();
  const hydrated = useHydrated();
  const localSolved = useProgressStore((state) => state.solved);
  const solved = mergeSolved(user?.solved_slugs, hydrated ? localSolved : []);
  const done = questions.filter((question) => solved.has(question.slug)).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        {done}/{questions.length} solved
      </p>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <ol>
          {questions.map((question, index) => (
            <li key={question.slug} className="flex items-center gap-3 border-t border-zinc-800 px-4 py-3 first:border-t-0">
              <span className="w-6 text-xs text-zinc-600">{index + 1}</span>
              <span className="w-4 text-zinc-500">{solved.has(question.slug) ? "✓" : "—"}</span>
              <Link href={`/problems/${question.slug}`} className="flex-1 font-medium text-zinc-100 hover:text-lime-300">
                {question.id}. {question.title}
              </Link>
              <Badge variant={question.difficulty}>{question.difficulty}</Badge>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
