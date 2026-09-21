import { NextResponse } from "next/server";
import { canonicalizeAvatarUrl, DEFAULT_AVATAR, isAllowedAvatarUrl } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import { usernameIssue } from "@/lib/username";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { username?: string | null; avatar_url?: string | null; skip?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const skip = Boolean(body.skip);
  const username = skip ? null : (body.username ?? "").trim().toLowerCase() || null;
  if (username) {
    const issue = usernameIssue(username);
    if (issue) {
      return NextResponse.json({ error: issue }, { status: 400 });
    }
  }

  let avatarUrl = skip ? null : (body.avatar_url ?? "").trim() || null;
  if (avatarUrl) avatarUrl = canonicalizeAvatarUrl(avatarUrl);
  if (avatarUrl && !isAllowedAvatarUrl(avatarUrl, user.id)) {
    return NextResponse.json({ error: "That avatar cannot be used." }, { status: 400 });
  }
  if (skip) {
    avatarUrl = DEFAULT_AVATAR;
  }

  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_username: username,
    p_avatar_url: avatarUrl,
  });

  if (error) {
    const taken = error.code === "23505" || /taken/i.test(error.message);
    return NextResponse.json(
      { error: taken ? "That username is taken." : error.message },
      { status: taken ? 409 : 400 },
    );
  }

  return NextResponse.json(data);
}
