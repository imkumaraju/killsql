import Link from "next/link";
import { Heart } from "lucide-react";
import { HideDonateToday } from "@/components/donate/hide-donate-today";
import { Button } from "@/components/ui/button";
import { sanitizeReturnPath } from "@/lib/donate";

export const metadata = {
  title: "Thank you",
};

export default async function DonateSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const href = sanitizeReturnPath(next);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(190,242,100,0.14),_transparent_55%)]" />
      <HideDonateToday />
      <div className="relative mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lime-400/15 text-lime-400 ring-1 ring-lime-400/30">
          <Heart className="h-6 w-6 fill-current" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Thank you</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Your donation helps keep KillSQL free — hosting, domains, and new problems for anyone
          who wants to practice SQL.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href={href}>Back to practicing</Link>
        </Button>
      </div>
    </div>
  );
}
