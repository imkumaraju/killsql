"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/use-user";

const OPEN_PATHS = new Set(["/welcome"]);

export function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.onboarding_completed) {
      if (pathname === "/welcome" || pathname === "/login") router.replace("/problems");
      return;
    }
    if (OPEN_PATHS.has(pathname) || pathname.startsWith("/auth/")) return;
    router.replace("/welcome");
  }, [isLoading, pathname, router, user]);

  return null;
}
