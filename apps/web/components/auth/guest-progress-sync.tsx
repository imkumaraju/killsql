"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useProgressStore } from "@/lib/local-progress";
import { useHydrated } from "@/lib/use-hydrated";
import { useCurrentUser } from "@/lib/use-user";

const GUEST_SQL = "-- synced from guest progress";

export function GuestProgressSync() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const solved = useProgressStore((state) => state.solved);
  const attempts = useProgressStore((state) => state.attempts);
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || !user?.onboarding_completed || started.current) return;
    started.current = true;
    const server = new Set(user.solved_slugs);
    const missing = solved.filter((slug) => !server.has(slug));
    if (missing.length === 0) return;

    const solves = missing.map((slug) => {
      const pass = (attempts[slug] ?? []).find((attempt) => attempt.status === "pass");
      return { problem_slug: slug, sql_written: pass?.sql ?? GUEST_SQL };
    });

    void fetch("/api/submissions/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solves }),
    }).then((response) => {
      if (response.ok) {
        void queryClient.invalidateQueries({ queryKey: ["current-user"] });
        return;
      }
      started.current = false;
    });
  }, [attempts, hydrated, queryClient, solved, user]);

  return null;
}
