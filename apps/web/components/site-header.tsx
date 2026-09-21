"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LogOut, TerminalSquare } from "lucide-react";
import { DonatePrompt, useDonatePrompt } from "@/components/donate/donate-prompt";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { StreakChip } from "@/components/streak/streak-chip";
import { useCurrentUser } from "@/lib/use-user";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { href: "/problems", label: "Problems" },
  { href: "/learn", label: "Learn" },
  { href: "/streak", label: "Streak" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const openDonatePrompt = useDonatePrompt((state) => state.openPrompt);

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    queryClient.setQueryData(["current-user"], null);
    queryClient.setQueryData(["active-streak"], null);
    router.refresh();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-lime-400 text-zinc-950">
              <TerminalSquare className="h-4 w-4" />
            </span>
            <span className="text-zinc-50">
              Kill<span className="text-lime-400">SQL</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                  pathname.startsWith(link.href) && "bg-zinc-900 text-zinc-50",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={openDonatePrompt}>
            <Heart className="h-4 w-4 text-lime-400" />
            <span className="hidden sm:inline">Donate</span>
          </Button>
          <StreakChip />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-lime-400/60 focus-visible:ring-2">
                  <Avatar>
                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.username} />
                    <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.username}`}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/streak">Streak</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
      <DonatePrompt />
    </header>
  );
}
