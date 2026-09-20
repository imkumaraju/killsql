import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadStreakPayload } from "@/lib/streaks";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(null);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(null);

  const [{ data: profile }, { data: stats }, { data: solved }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_stats").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("submissions")
      .select("problem_slug")
      .eq("user_id", user.id)
      .eq("status", "pass"),
  ]);

  const solvedSlugs = [...new Set((solved ?? []).map((row) => row.problem_slug))];
  const streak = await loadStreakPayload(supabase, user.id, { tick: true });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    username: profile?.username ?? user.email?.split("@")[0] ?? "user",
    avatar_url: profile?.avatar_url ?? null,
    stats: stats ?? null,
    solved_slugs: solvedSlugs,
    streak,
  });
}
