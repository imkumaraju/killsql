import type { Metadata } from "next";
import { ProblemList } from "@/components/problems/problem-list";
import { loadQuestionSummaries } from "@/lib/questions";

export const metadata: Metadata = {
  title: "Problems",
};

export default function ProblemsPage() {
  const questions = loadQuestionSummaries();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Problems</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Filter by difficulty, tag, or solved status. Queries still run on your machine.
        </p>
      </div>
      <ProblemList questions={questions} />
    </div>
  );
}
