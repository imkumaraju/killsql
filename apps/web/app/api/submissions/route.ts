import { NextResponse } from "next/server";
import { recordSubmission } from "@/lib/record-submission";
import { createClient } from "@/lib/supabase/server";

type Body = {
  problem_slug?: string;
  status?: "pass" | "fail";
  sql_written?: string;
};

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

  const result = await recordSubmission(supabase, user.id, {
    problem_slug: body.problem_slug,
    status: body.status,
    sql_written: body.sql_written,
  });
  if ("error" in result && result.error) {
    const status = result.error === "Unknown problem" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
