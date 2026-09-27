"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProblemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Problem page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold text-zinc-50">This problem failed to load</h1>
      <p className="text-sm text-zinc-400">
        {error.message || "The SQL workspace crashed while starting."}
      </p>
      {error.digest ? <p className="font-mono text-xs text-zinc-600">digest {error.digest}</p> : null}
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="secondary">
          <a href="/problems">Back to problems</a>
        </Button>
      </div>
    </div>
  );
}
