"use client";

import type { Difficulty, QuestionSummary } from "@killsql/question-types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pickRandom } from "@/lib/daily";
import { mergeSolved, useProgressStore } from "@/lib/local-progress";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/use-user";

const filters: Array<"all" | Difficulty> = ["all", "easy", "medium", "hard"];

export function ProblemList({
  questions,
  dailySlug,
}: {
  questions: QuestionSummary[];
  dailySlug?: string;
}) {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const hydrated = useHydrated();
  const localSolved = useProgressStore((state) => state.solved);
  const lastSlug = useProgressStore((state) => state.lastSlug);
  const solved = mergeSolved(user?.solved_slugs, hydrated ? localSolved : []);
  const [difficulty, setDifficulty] = useState<(typeof filters)[number]>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "solved" | "todo">("all");
  const [tag, setTag] = useState<string>("all");
  const [company, setCompany] = useState<string>("all");

  const tags = useMemo(
    () => [...new Set(questions.flatMap((question) => question.tags))].sort(),
    [questions],
  );
  const companies = useMemo(
    () =>
      [...new Set(questions.flatMap((question) => question.companies ?? []))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [questions],
  );
  const last = hydrated ? questions.find((question) => question.slug === lastSlug) : undefined;

  const visible = questions.filter((question) => {
    if (difficulty !== "all" && question.difficulty !== difficulty) return false;
    if (tag !== "all" && !question.tags.includes(tag)) return false;
    if (company !== "all" && !(question.companies ?? []).includes(company)) return false;
    if (status === "solved" && !solved.has(question.slug)) return false;
    if (status === "todo" && solved.has(question.slug)) return false;
    if (query.trim()) {
      const haystack = `${question.title} ${question.tags.join(" ")} ${(question.companies ?? []).join(" ")}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {last ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/problems/${last.slug}`}>
              Continue {last.id}. {last.title}
            </Link>
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const pick = pickRandom(visible.length > 0 ? visible : questions, solved);
            if (pick) router.push(`/problems/${pick.slug}`);
          }}
        >
          <Shuffle className="h-3.5 w-3.5" />
          Random unsolved
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          placeholder="Search problems, tags, or companies"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="lg:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setDifficulty(item)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs uppercase tracking-wide",
                difficulty === item
                  ? "border-lime-400/40 bg-lime-400/10 text-lime-300"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <select
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-200"
        >
          <option value="all">All tags</option>
          {tags.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {companies.length > 0 ? (
          <select
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-200"
          >
            <option value="all">All companies</option>
            {companies.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        ) : null}
        <div className="flex gap-2">
          {(["all", "todo", "solved"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setStatus(item)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs uppercase tracking-wide",
                status === item
                  ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                  : "border-zinc-800 text-zinc-400",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Difficulty</th>
              <th className="px-4 py-3 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((question) => {
              const done = solved.has(question.slug);
              const isDaily = question.slug === dailySlug;
              return (
                <tr key={question.slug} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-zinc-500">{done ? "✓" : "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/problems/${question.slug}`} className="font-medium text-zinc-100 hover:text-lime-300">
                      {question.id}. {question.title}
                    </Link>
                    {isDaily ? (
                      <Badge variant="lime" className="ml-2 normal-case">
                        Today
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={question.difficulty}>{question.difficulty}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {question.tags.slice(0, 3).map((item) => (
                        <Badge key={item}>{item}</Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">No problems match those filters.</p>
        ) : null}
      </div>
    </div>
  );
}
