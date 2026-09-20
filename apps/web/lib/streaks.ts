import type { SupabaseClient } from "@supabase/supabase-js";

export const DURATION_PRESETS = [7, 14, 21, 30, 40] as const;
export const QUOTA_PRESETS = [1, 2, 3, 5] as const;
export const MAX_FREEZES = 2;

export type StreakStatus = "active" | "completed" | "broken" | "cancelled";
export type DayOutcome = "pending" | "confirmed" | "frozen" | "missed";

export type StreakChallenge = {
  id: string;
  user_id: string;
  duration_days: number;
  daily_quota: number;
  start_date: string;
  timezone: string;
  status: StreakStatus;
  confirmed_toward_freeze: number;
  created_at: string;
  ended_at: string | null;
};

export type StreakDay = {
  id: string;
  challenge_id: string;
  local_date: string;
  problems_solved: number;
  outcome: DayOutcome;
  freeze_consumed: boolean;
};

export type StreakPayload = {
  freeze_balance: number;
  challenge: StreakChallenge | null;
  days: StreakDay[];
  today: string;
  today_solved: number;
};

export function dateInTimeZone(timeZone: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function dayNumber(startDate: string, localDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const day = Date.parse(`${localDate}T00:00:00Z`);
  return Math.floor((day - start) / 86_400_000) + 1;
}

export function emptyStreakPayload(): StreakPayload {
  return {
    freeze_balance: 0,
    challenge: null,
    days: [],
    today: dateInTimeZone("UTC"),
    today_solved: 0,
  };
}

export async function loadStreakPayload(
  supabase: SupabaseClient,
  userId: string,
  options?: { tick?: boolean },
): Promise<StreakPayload> {
  if (options?.tick) {
    const { error } = await supabase.rpc("tick_my_goal_streak");
    if (error) {
      return emptyStreakPayload();
    }
  }

  const [{ data: stats }, challengeResult] = await Promise.all([
    supabase
      .from("user_stats")
      .select("streak_freeze_balance")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("streak_challenges")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (challengeResult.error) {
    return {
      ...emptyStreakPayload(),
      freeze_balance: Number(stats?.streak_freeze_balance ?? 0),
    };
  }

  const freezeBalance = Number(stats?.streak_freeze_balance ?? 0);
  const challenge = challengeResult.data;
  if (!challenge) {
    return {
      ...emptyStreakPayload(),
      freeze_balance: freezeBalance,
    };
  }

  const typedChallenge = challenge as StreakChallenge;
  const { data: days } = await supabase
    .from("streak_days")
    .select("*")
    .eq("challenge_id", typedChallenge.id)
    .order("local_date", { ascending: true });

  const today = dateInTimeZone(typedChallenge.timezone);
  const typedDays = (days ?? []) as StreakDay[];
  const todayRow = typedDays.find((row) => row.local_date === today);

  return {
    freeze_balance: freezeBalance,
    challenge: typedChallenge,
    days: typedDays,
    today,
    today_solved: Number(todayRow?.problems_solved ?? 0),
  };
}

export function calendarTone(day: StreakDay, today: string): string {
  if (day.outcome === "confirmed") return "bg-lime-400";
  if (day.outcome === "frozen") return "bg-sky-400";
  if (day.outcome === "missed") return "bg-red-500";
  if (day.local_date === today) return "bg-amber-400";
  if (day.local_date > today) return "bg-zinc-800";
  return "bg-zinc-700";
}
