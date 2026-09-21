"use client";

import type { QuestionSummary } from "@killsql/question-types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useProgressStore } from "@/lib/local-progress";
import { useHydrated } from "@/lib/use-hydrated";

export function PracticeShortcuts({
  questions,
  daily,
}: {
  questions: QuestionSummary[];
  daily?: QuestionSummary;
}) {
  const hydrated = useHydrated();
  const lastSlug = useProgressStore((state) => state.lastSlug);
  const last = hydrated ? questions.find((question) => question.slug === lastSlug) : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {daily ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-lime-400">Today</p>
          <h2 className="mt-2 font-medium text-zinc-50">
            {daily.id}. {daily.title}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">One problem a day. Same for everyone (UTC).</p>
          <Button asChild size="sm" className="mt-4">
            <Link href={`/problems/${daily.slug}`}>Solve today&apos;s problem</Link>
          </Button>
        </div>
      ) : null}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Continue</p>
        {last ? (
          <>
            <h2 className="mt-2 font-medium text-zinc-50">
              {last.id}. {last.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">Pick up the problem you last opened.</p>
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Link href={`/problems/${last.slug}`}>Continue</Link>
            </Button>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-medium text-zinc-50">Start a track</h2>
            <p className="mt-1 text-sm text-zinc-400">Joins, window functions, and more — in a sensible order.</p>
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Link href="/learn">Browse tracks</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
