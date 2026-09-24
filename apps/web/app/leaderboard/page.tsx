import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-zinc-400">
        The leaderboard needs Supabase. You can still solve every problem locally.
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: stats } = await supabase
    .from("user_stats")
    .select("user_id, total_solved, current_streak")
    .gt("total_solved", 0)
    .order("total_solved", { ascending: false })
    .order("current_streak", { ascending: false })
    .limit(50);

  const ids = (stats ?? []).map((row) => row.user_id);
  const { data: profiles } =
    ids.length > 0
      ? await supabase.from("profiles").select("id, username, avatar_url").in("id", ids)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const rows = (stats ?? [])
    .flatMap((row) => {
      const profile = profileById.get(row.user_id);
      if (!profile?.username) return [];
      return [
        {
          userId: row.user_id as string,
          username: profile.username as string,
          avatar_url: profile.avatar_url as string | null,
          total_solved: row.total_solved as number,
          current_streak: row.current_streak as number,
        },
      ];
    })
    .sort((a, b) => {
      if (b.total_solved !== a.total_solved) return b.total_solved - a.total_solved;
      if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
      return a.username.localeCompare(b.username);
    })
    .map((row, index) => ({ ...row, rank: index + 1, you: row.userId === user?.id }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mt-2 text-sm text-zinc-400">Ranked by unique problems solved.</p>
      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Solved</th>
              <th className="px-4 py-3">Streak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.username}
                className={row.you ? "border-t border-lime-900 bg-lime-950/40" : "border-t border-zinc-800"}
              >
                <td className="px-4 py-3 text-zinc-500">{row.rank}</td>
                <td className="px-4 py-3">
                  <Link href={`/profile/${row.username}`} className="flex items-center gap-2 hover:text-lime-300">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={row.avatar_url ?? undefined} />
                      <AvatarFallback>{row.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    @{row.username}
                    {row.you ? <span className="text-xs text-lime-400">you</span> : null}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.total_solved}</td>
                <td className="px-4 py-3">{row.current_streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            No solvers yet. Sign in and pass a problem to take first place.
          </p>
        ) : null}
      </div>
    </div>
  );
}
