import type { Metadata } from "next";
import { ProblemList } from "@/components/problems/problem-list";
import { pickDaily } from "@/lib/daily";
import { loadQuestionSummaries } from "@/lib/questions";

export const metadata: Metadata = {
  title: "Problems",
};

export default function ProblemsPage() {
  const questions = loadQuestionSummaries();
  const daily = pickDaily(questions);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Problems</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Filter by difficulty, tag, company, or solved status. Queries run in DuckDB in your browser.
        </p>
      </div>
      <ProblemList questions={questions} dailySlug={daily?.slug} />
    </div>
  );
}
