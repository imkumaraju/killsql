import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadQuestionSummaries } from "@/lib/questions";
import { getTrack, questionsForTrack, TRACKS } from "@/lib/tracks";
import { TrackProblemList } from "@/components/learn/track-problem-list";

export function generateStaticParams() {
  return TRACKS.map((track) => ({ slug: track.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const track = getTrack(slug);
  return { title: track?.title ?? "Track" };
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = getTrack(slug);
  if (!track) notFound();
  const questions = questionsForTrack(loadQuestionSummaries(), track);
  const first = questions[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="text-sm text-zinc-500">
        <Link href="/learn" className="hover:text-zinc-200">
          Tracks
        </Link>
        <span className="px-2">/</span>
        {track.title}
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{track.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">{track.description}</p>
        </div>
        {first ? (
          <Button asChild>
            <Link href={`/problems/${first.slug}`}>Start this track</Link>
          </Button>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {track.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
      <div className="mt-8">
        <TrackProblemList questions={questions} />
      </div>
    </div>
  );
}
