import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/problems";
  const supabase = await createClient();

  if (code && supabase) {
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.onboarding_completed) {
        return NextResponse.redirect(new URL("/welcome", url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
