"use client";

import dynamic from "next/dynamic";
import type { Question, QuestionSummary } from "@killsql/question-types";

const SqlWorkspace = dynamic(
  () => import("@/components/editor/sql-workspace").then((mod) => mod.SqlWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Loading problem…
      </div>
    ),
  },
);

export function ProblemWorkspace({
  question,
  questions,
}: {
  question: Question;
  questions: QuestionSummary[];
}) {
  return <SqlWorkspace key={question.slug} question={question} questions={questions} />;
}
