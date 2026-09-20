import Link from "next/link";
import { ArrowRight, Cpu, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadQuestionSummaries } from "@/lib/questions";

export default function HomePage() {
  const questions = loadQuestionSummaries();
  const sample = questions[0];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(190,242,100,0.12),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(39,39,42,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(39,39,42,0.35)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <section className="relative mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-24 pt-20">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-lime-400">
            Open source · runs locally
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
            Practice SQL.
            <br />
            In your browser.
            <span className="text-lime-400"> For free.</span>
          </h1>
          <p className="max-w-xl text-lg text-zinc-400">
            KillSQL is a LeetCode-style problem set where every query executes in DuckDB-WASM.
            There is no query server. Questions are static JSON. The backend only stores your
            progress.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={sample ? `/problems/${sample.slug}` : "/problems"}>
                Start a problem
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/problems">Browse {questions.length} problems</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/streak">Start a streak</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Cpu,
              title: "DuckDB in a worker",
              body: "Window functions, CTEs, and UNNEST run on your machine. The UI stays responsive.",
            },
            {
              icon: Globe,
              title: "Questions as files",
              body: "Add a JSON file, open a PR. No migration, no admin panel, no database write.",
            },
            {
              icon: Shield,
              title: "Thin backend",
              body: "Supabase stores accounts and submissions. SQL never leaves the browser.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <feature.icon className="mb-3 h-5 w-5 text-lime-400" />
              <h2 className="font-medium text-zinc-50">{feature.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{feature.body}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="ml-2">select-all-employees.sql</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-sm leading-6 text-zinc-300">
            <span className="text-zinc-500">-- runs in DuckDB-WASM, not on our servers</span>
            {"\n"}
            <span className="text-lime-300">SELECT</span>
            {" *\n"}
            <span className="text-lime-300">FROM</span>
            {" employees;\n"}
          </pre>
        </div>
      </section>
    </div>
  );
}
