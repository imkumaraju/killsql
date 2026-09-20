"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Flame, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/lib/use-user";
import {
  DURATION_PRESETS,
  MAX_FREEZES,
  QUOTA_PRESETS,
  calendarTone,
  dayNumber,
  detectTimeZone,
  emptyStreakPayload,
  type StreakPayload,
} from "@/lib/streaks";
import { cn } from "@/lib/utils";

function useBrowserTimeZone() {
  return useSyncExternalStore(
    () => () => undefined,
    detectTimeZone,
    () => "UTC",
  );
}

async function fetchStreak(): Promise<StreakPayload> {
  const response = await fetch("/api/streaks");
  if (response.status === 401) return emptyStreakPayload();
  if (!response.ok) throw new Error("Could not load streak");
  return (await response.json()) as StreakPayload;
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        selected
          ? "border-lime-400 bg-lime-400/10 text-lime-300"
          : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100",
      )}
    >
      {children}
    </button>
  );
}

export function StreakDashboard() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const streakQuery = useQuery({
    queryKey: ["active-streak"],
    queryFn: fetchStreak,
    enabled: Boolean(user),
  });

  const detectedZone = useBrowserTimeZone();
  const [duration, setDuration] = useState(40);
  const [customDuration, setCustomDuration] = useState("");
  const [quota, setQuota] = useState(2);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timezoneValue = timezone ?? detectedZone;

  const start = useMutation({
    mutationFn: async () => {
      const days = customDuration ? Number(customDuration) : duration;
      const response = await fetch("/api/streaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_days: days,
          daily_quota: quota,
          timezone: timezoneValue,
        }),
      });
      const body = (await response.json()) as StreakPayload & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not start streak");
      return body;
    },
    onSuccess: (payload) => {
      setError(null);
      queryClient.setQueryData(["active-streak"], payload);
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/streaks", { method: "DELETE" });
      const body = (await response.json()) as StreakPayload & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not cancel streak");
      return body;
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(["active-streak"], payload);
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (userLoading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to start a streak</CardTitle>
          <CardDescription>
            Pick a duration and a daily quota. We confirm every day that you hit it — miss a day
            without a freeze and the streak breaks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const payload = streakQuery.data ?? emptyStreakPayload();
  const challenge = payload.challenge;
  const active = challenge?.status === "active";

  return (
    <div className="space-y-8">
      <FreezeBar balance={payload.freeze_balance} toward={challenge?.confirmed_toward_freeze ?? 0} />

      {active && challenge ? (
        <ActiveStreak
          payload={payload}
          onCancel={() => {
            if (window.confirm("Cancel this streak? Progress for this challenge will end.")) {
              cancel.mutate();
            }
          }}
          cancelling={cancel.isPending}
        />
      ) : (
        <>
          {challenge ? <FinishedBanner payload={payload} /> : null}
          <Card>
            <CardHeader>
              <CardTitle>Start a streak</CardTitle>
              <CardDescription>
                Example: 40 days, 2 problems a day. Hit the quota every local day to keep it alive.
                Every 3 confirmed days earns a streak freeze (max {MAX_FREEZES}).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Duration</p>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((days) => (
                    <Chip
                      key={days}
                      selected={!customDuration && duration === days}
                      onClick={() => {
                        setDuration(days);
                        setCustomDuration("");
                      }}
                    >
                      {days} days
                    </Chip>
                  ))}
                </div>
                <Input
                  className="mt-3 max-w-xs"
                  type="number"
                  min={1}
                  max={365}
                  placeholder="Custom days"
                  value={customDuration}
                  onChange={(event) => setCustomDuration(event.target.value)}
                />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
                  Problems per day
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUOTA_PRESETS.map((count) => (
                    <Chip key={count} selected={quota === count} onClick={() => setQuota(count)}>
                      {count} / day
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="max-w-xs">
                <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Timezone</p>
                <Input value={timezoneValue} onChange={(event) => setTimezone(event.target.value)} />
                <p className="mt-1 text-xs text-zinc-500">
                  Day boundaries use this zone so midnight is local, not UTC.
                </p>
              </div>
              {error ? <p className="text-sm text-amber-200">{error}</p> : null}
              <Button onClick={() => start.mutate()} disabled={start.isPending}>
                {start.isPending ? "Starting…" : "Start streak"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function FreezeBar({ balance, toward }: { balance: number; toward: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm">
      <Snowflake className="h-4 w-4 text-sky-300" />
      <span className="text-zinc-200">
        {balance}/{MAX_FREEZES} streak freezes
      </span>
      <span className="text-zinc-500">
        {3 - toward} confirmed day{3 - toward === 1 ? "" : "s"} until the next freeze
      </span>
    </div>
  );
}

function FinishedBanner({ payload }: { payload: StreakPayload }) {
  const challenge = payload.challenge;
  if (!challenge || challenge.status === "active") return null;
  const confirmed = payload.days.filter((day) => day.outcome === "confirmed").length;
  const frozen = payload.days.filter((day) => day.outcome === "frozen").length;
  const copy =
    challenge.status === "completed"
      ? `You finished ${challenge.duration_days} days.`
      : challenge.status === "broken"
        ? `Streak broken after ${confirmed} confirmed day${confirmed === 1 ? "" : "s"}.`
        : "This streak was cancelled.";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{challenge.status}</CardTitle>
        <CardDescription>
          {copy} {frozen > 0 ? `${frozen} freeze${frozen === 1 ? "" : "s"} used.` : null} Start a
          new one whenever you are ready.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ActiveStreak({
  payload,
  onCancel,
  cancelling,
}: {
  payload: StreakPayload;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const challenge = payload.challenge!;
  const day = dayNumber(challenge.start_date, payload.today);
  const quotaMet = payload.today_solved >= challenge.daily_quota;
  const latestFreeze = [...payload.days].reverse().find((row) => row.freeze_consumed);

  return (
    <div className="space-y-6">
      {latestFreeze && latestFreeze.local_date >= challenge.start_date ? (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          Streak freeze used on {latestFreeze.local_date} — your streak is still alive.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Progress</p>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Flame className="h-5 w-5 text-orange-400" />
              Day {Math.min(day, challenge.duration_days)}/{challenge.duration_days}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Today</p>
            <CardTitle className="text-2xl">
              {Math.min(payload.today_solved, challenge.daily_quota)}/{challenge.daily_quota}
            </CardTitle>
            <CardDescription>{quotaMet ? "Quota met" : "Keep going"}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Freezes</p>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Snowflake className="h-5 w-5 text-sky-300" />
              {payload.freeze_balance}
            </CardTitle>
            <CardDescription>Auto-used if you miss a day</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>
            Green = quota met · Ice = freeze · Amber = today · Red = missed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {payload.days.map((row) => (
              <span
                key={row.local_date}
                title={`${row.local_date} · ${row.outcome} · ${row.problems_solved}/${challenge.daily_quota}`}
                className={cn("h-7 w-7 rounded-md", calendarTone(row, payload.today))}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/problems">Solve today&apos;s problems</Link>
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={cancelling}>
          Cancel streak
        </Button>
      </div>
    </div>
  );
}
