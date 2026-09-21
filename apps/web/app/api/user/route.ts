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

  const [{ data: profile }, { data: privateRow }, { data: stats }, { data: solved }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("profile_private").select("email").eq("user_id", user.id).maybeSingle(),
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
    email: privateRow?.email ?? user.email,
    username: profile?.username ?? user.email?.split("@")[0] ?? "user",
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    onboarding_completed: Boolean(profile?.onboarding_completed),
    stats: stats ?? null,
    solved_slugs: solvedSlugs,
    streak,
  });
}
