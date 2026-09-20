"use client";

import Link from "next/link";
import { Flame, Snowflake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/use-user";
import { emptyStreakPayload, dayNumber, type StreakPayload } from "@/lib/streaks";
import { cn } from "@/lib/utils";

async function fetchStreak(): Promise<StreakPayload> {
  const response = await fetch("/api/streaks");
  if (!response.ok) return emptyStreakPayload();
  return (await response.json()) as StreakPayload;
}

export function StreakChip() {
  const { data: user } = useCurrentUser();
  const { data: streak } = useQuery({
    queryKey: ["active-streak"],
    queryFn: fetchStreak,
    enabled: Boolean(user),
  });

  if (!user) return null;

  const challenge = streak?.challenge;
  const active = challenge?.status === "active";

  if (!active || !challenge || !streak) {
    return (
      <Link
        href="/streak"
        className="hidden items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-100 sm:flex"
      >
        <Flame className="h-3.5 w-3.5 text-zinc-500" />
        Start a streak
      </Link>
    );
  }

  const today = `${Math.min(streak.today_solved, challenge.daily_quota)}/${challenge.daily_quota}`;

  return (
    <Link
      href="/streak"
      className={cn(
        "hidden items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-200 hover:border-lime-400/40 sm:flex",
      )}
    >
      <Flame className="h-3.5 w-3.5 text-orange-400" />
      Day {Math.min(dayNumber(challenge.start_date, streak.today), challenge.duration_days)}/{challenge.duration_days}
      <span className="text-zinc-500">·</span>
      {today} today
      <Snowflake className="ml-0.5 h-3.5 w-3.5 text-sky-300" />
      {streak.freeze_balance}
    </Link>
  );
}
