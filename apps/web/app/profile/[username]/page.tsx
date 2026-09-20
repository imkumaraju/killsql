import { createClient } from "@/lib/supabase/server";
import { loadQuestionBySlug } from "@/lib/questions";
import { calendarTone, dateInTimeZone, type StreakChallenge, type StreakDay } from "@/lib/streaks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

function lastWeeks(dates: string[], weeks = 17) {
  const set = new Set(dates);
  const cells: { date: string; active: boolean }[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (weeks * 7 - 1));
  for (let i = 0; i < weeks * 7; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const key = day.toISOString().slice(0, 10);
    cells.push({ date: key, active: set.has(key) });
  }
  return cells;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-zinc-400">
        Profiles require Supabase. Add credentials to <code>.env.local</code> and apply the
        migration.
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const [{ data: stats }, { data: submissions }, { data: challenge }] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", profile.id).maybeSingle(),
    supabase
      .from("submissions")
      .select("problem_slug, status, solved_at, sql_written")
      .eq("user_id", profile.id)
      .order("solved_at", { ascending: false })
      .limit(20),
    supabase
      .from("streak_challenges")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const passDates = (submissions ?? [])
    .filter((row) => row.status === "pass")
    .map((row) => String(row.solved_at).slice(0, 10));
  const cells = lastWeeks(passDates);
  const goalChallenge = (challenge ?? null) as StreakChallenge | null;
  const { data: goalDays } = goalChallenge
    ? await supabase
        .from("streak_days")
        .select("*")
        .eq("challenge_id", goalChallenge.id)
        .order("local_date", { ascending: true })
    : { data: [] as StreakDay[] };
  const today = goalChallenge ? dateInTimeZone(goalChallenge.timezone) : "";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.username} />
          <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold">@{profile.username}</h1>
          <p className="text-sm text-zinc-400">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Solved", stats?.total_solved ?? 0],
          ["Easy", stats?.easy_solved ?? 0],
          ["Medium", stats?.medium_solved ?? 0],
          ["Hard", stats?.hard_solved ?? 0],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader>
              <CardDescriptionLabel>{label}</CardDescriptionLabel>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <p className="text-sm text-zinc-400">
            Current {stats?.current_streak ?? 0} · Longest {stats?.longest_streak ?? 0} · Freezes{" "}
            {stats?.streak_freeze_balance ?? 0}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {cells.map((cell) => (
              <span
                key={cell.date}
                title={cell.date}
                className={`h-3 w-3 rounded-sm ${cell.active ? "bg-lime-400" : "bg-zinc-800"}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {goalChallenge ? (
        <Card>
          <CardHeader>
            <CardTitle>Goal streak</CardTitle>
            <p className="text-sm text-zinc-400">
              {goalChallenge.status} · {goalChallenge.duration_days} days ·{" "}
              {goalChallenge.daily_quota} / day
              {goalChallenge.status === "active" ? (
                <>
                  {" "}
                  · <Link href="/streak" className="text-lime-300 hover:underline">Open streak</Link>
                </>
              ) : null}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {(goalDays as StreakDay[] | null)?.map((day) => (
                <span
                  key={day.local_date}
                  title={`${day.local_date} · ${day.outcome}`}
                  className={`h-4 w-4 rounded-sm ${calendarTone(day, today)}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(submissions ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No submissions yet.</p>
          ) : (
            submissions?.map((row) => {
              const question = loadQuestionBySlug(row.problem_slug);
              return (
                <div
                  key={`${row.problem_slug}-${row.solved_at}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 px-3 py-2 text-sm"
                >
                  <Link href={`/problems/${row.problem_slug}`} className="hover:text-lime-300">
                    {question?.title ?? row.problem_slug}
                  </Link>
                  <Badge variant={row.status === "pass" ? "easy" : "hard"}>{row.status}</Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CardDescriptionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs uppercase tracking-wider text-zinc-500">{children}</p>;
}
