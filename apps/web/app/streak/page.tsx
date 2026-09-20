import { StreakDashboard } from "@/components/streak/streak-dashboard";

export const metadata = { title: "Streak" };

export default function StreakPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Goal streak</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Set a number of days and how many problems you will solve each day. We confirm the quota
          every local midnight. Miss a day without a freeze and the streak breaks.
        </p>
      </div>
      <StreakDashboard />
    </div>
  );
}
