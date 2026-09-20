"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type CurrentUser = {
  id: string;
  email?: string;
  username: string;
  avatar_url: string | null;
  stats: {
    total_solved: number;
    easy_solved: number;
    medium_solved: number;
    hard_solved: number;
    current_streak: number;
    longest_streak: number;
    streak_freeze_balance?: number;
  } | null;
  solved_slugs: string[];
};

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const response = await fetch("/api/user");
  if (!response.ok) return null;
  return (await response.json()) as CurrentUser;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
  });
}
