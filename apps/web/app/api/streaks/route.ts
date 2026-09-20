import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emptyStreakPayload, loadStreakPayload } from "@/lib/streaks";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(emptyStreakPayload());
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(emptyStreakPayload(), { status: 401 });
  }

  const payload = await loadStreakPayload(supabase, user.id, { tick: true });
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    duration_days?: number;
    daily_quota?: number;
    timezone?: string;
  };

  const durationDays = Number(body.duration_days);
  const dailyQuota = Number(body.daily_quota);
  const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "";

  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
    return NextResponse.json({ error: "Pick a duration between 1 and 365 days" }, { status: 400 });
  }
  if (!Number.isInteger(dailyQuota) || dailyQuota < 1 || dailyQuota > 20) {
    return NextResponse.json({ error: "Pick a daily quota between 1 and 20" }, { status: 400 });
  }
  if (!timezone || timezone.length > 64) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const { error } = await supabase.rpc("start_goal_streak", {
    p_duration_days: durationDays,
    p_daily_quota: dailyQuota,
    p_timezone: timezone,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload = await loadStreakPayload(supabase, user.id, { tick: false });
  return NextResponse.json(payload);
}

export async function DELETE() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.rpc("cancel_goal_streak");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload = await loadStreakPayload(supabase, user.id, { tick: false });
  return NextResponse.json(payload);
}
