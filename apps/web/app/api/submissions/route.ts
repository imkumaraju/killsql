import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadQuestionBySlug } from "@/lib/questions";

type Body = {
  problem_slug?: string;
  status?: "pass" | "fail";
  sql_written?: string;
  difficulty?: "easy" | "medium" | "hard";
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
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

  const body = (await request.json()) as Body;
  if (!body.problem_slug || !body.status || typeof body.sql_written !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const question = loadQuestionBySlug(body.problem_slug);
  if (!question) {
    return NextResponse.json({ error: "Unknown problem" }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("submissions").insert({
    user_id: user.id,
    problem_slug: body.problem_slug,
    status: body.status,
    sql_written: body.sql_written,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (body.status === "pass") {
    const { data: previous } = await supabase
      .from("submissions")
      .select("id")
      .eq("user_id", user.id)
      .eq("problem_slug", body.problem_slug)
      .eq("status", "pass");

    const firstSolve = (previous?.length ?? 0) <= 1;
    const { data: stats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const today = toDateString(new Date());
    const yesterday = toDateString(addDays(new Date(), -1));
    let currentStreak = stats?.current_streak ?? 0;
    if (stats?.last_active_date === today) {
      currentStreak = stats.current_streak;
    } else if (stats?.last_active_date === yesterday) {
      currentStreak = (stats.current_streak ?? 0) + 1;
    } else {
      currentStreak = 1;
    }

    const patch: Record<string, number | string> = {
      current_streak: currentStreak,
      longest_streak: Math.max(stats?.longest_streak ?? 0, currentStreak),
      last_active_date: today,
    };

    if (firstSolve) {
      patch.total_solved = (stats?.total_solved ?? 0) + 1;
      if (question.difficulty === "easy") patch.easy_solved = (stats?.easy_solved ?? 0) + 1;
      if (question.difficulty === "medium") patch.medium_solved = (stats?.medium_solved ?? 0) + 1;
      if (question.difficulty === "hard") patch.hard_solved = (stats?.hard_solved ?? 0) + 1;
    }

    await supabase.from("user_stats").upsert({ user_id: user.id, ...patch });
  }

  return NextResponse.json({ ok: true });
}
