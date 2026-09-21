import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { loadQuestionSummaries } from "@/lib/questions";
import { questionsForTrack, TRACKS } from "@/lib/tracks";

export const metadata: Metadata = {
  title: "Learn",
};

export default function LearnPage() {
  const questions = loadQuestionSummaries();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Tracks</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        The same problems, grouped by topic so you can practice joins before window functions.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRACKS.map((track) => {
          const items = questionsForTrack(questions, track);
          return (
            <Link
              key={track.slug}
              href={`/learn/${track.slug}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-600"
            >
              <h2 className="font-medium text-zinc-50">{track.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{track.description}</p>
              <p className="mt-3 text-xs text-zinc-500">{items.length} problems</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {track.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
