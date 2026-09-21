import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { DEFAULT_AVATAR } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Set up your profile" };

export default async function WelcomePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: privateRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("profile_private").select("email").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profile?.onboarding_completed) redirect("/problems");

  const meta = user.user_metadata ?? {};
  const googleAvatar =
    typeof meta.avatar_url === "string"
      ? meta.avatar_url
      : typeof meta.picture === "string"
        ? meta.picture
        : null;

  return (
    <OnboardingForm
      assignedUsername={profile?.username ?? `user_${user.id.slice(0, 8)}`}
      displayName={profile?.display_name ?? (typeof meta.full_name === "string" ? meta.full_name : null)}
      email={privateRow?.email ?? user.email ?? null}
      currentAvatar={profile?.avatar_url ?? DEFAULT_AVATAR}
      providerAvatar={googleAvatar}
    />
  );
}
