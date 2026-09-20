"use client";

import type { Difficulty, QuestionSummary } from "@killsql/question-types";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/use-user";

const filters: Array<"all" | Difficulty> = ["all", "easy", "medium", "hard"];

export function ProblemList({ questions }: { questions: QuestionSummary[] }) {
  const { data: user } = useCurrentUser();
  const solved = new Set(user?.solved_slugs ?? []);
  const [difficulty, setDifficulty] = useState<(typeof filters)[number]>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "solved" | "todo">("all");
  const [tag, setTag] = useState<string>("all");

  const tags = useMemo(
    () => [...new Set(questions.flatMap((question) => question.tags))].sort(),
    [questions],
  );

  const visible = questions.filter((question) => {
    if (difficulty !== "all" && question.difficulty !== difficulty) return false;
    if (tag !== "all" && !question.tags.includes(tag)) return false;
    if (status === "solved" && !solved.has(question.slug)) return false;
    if (status === "todo" && solved.has(question.slug)) return false;
    if (query.trim()) {
      const haystack = `${question.title} ${question.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          placeholder="Search problems or tags"
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
        {user ? (
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
        ) : null}
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
              return (
                <tr key={question.slug} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-zinc-500">{done ? "✓" : "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/problems/${question.slug}`} className="font-medium text-zinc-100 hover:text-lime-300">
                      {question.id}. {question.title}
                    </Link>
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
