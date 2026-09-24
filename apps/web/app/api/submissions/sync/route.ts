import { NextResponse } from "next/server";
import { recordSubmission } from "@/lib/record-submission";
import { createClient } from "@/lib/supabase/server";

type Solve = {
  problem_slug?: string;
  sql_written?: string;
};

const MAX_SYNCS = 100;

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

  let solves: Solve[] = [];
  try {
    const body = (await request.json()) as { solves?: unknown };
    if (!Array.isArray(body.solves)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    solves = body.solves.slice(0, MAX_SYNCS) as Solve[];
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("submissions")
    .select("problem_slug")
    .eq("user_id", user.id)
    .eq("status", "pass");
  const already = new Set((existing ?? []).map((row) => row.problem_slug));

  const synced: string[] = [];
  for (const solve of solves) {
    if (!solve.problem_slug || typeof solve.sql_written !== "string") continue;
    if (already.has(solve.problem_slug)) continue;
    const result = await recordSubmission(supabase, user.id, {
      problem_slug: solve.problem_slug,
      status: "pass",
      sql_written: solve.sql_written,
    });
    if ("ok" in result) {
      already.add(solve.problem_slug);
      synced.push(solve.problem_slug);
    }
  }

  return NextResponse.json({ ok: true, synced });
}
