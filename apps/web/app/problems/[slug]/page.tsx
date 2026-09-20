import { notFound } from "next/navigation";
import { SqlWorkspace } from "@/components/editor/sql-workspace";
import { loadAllQuestions, loadQuestionBySlug } from "@/lib/questions";

export function generateStaticParams() {
  return loadAllQuestions().map((question) => ({ slug: question.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const question = loadQuestionBySlug(slug);
  return {
    title: question?.title ?? "Problem",
  };
}

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const question = loadQuestionBySlug(slug);
  if (!question) notFound();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col">
      <SqlWorkspace question={question} />
    </div>
  );
}
