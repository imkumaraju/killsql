import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How KillSQL collects, uses, and stores account and practice data.",
};

const sections = [
  {
    title: "Who we are",
    body: [
      "KillSQL (killsql.org) is a free SQL practice site. Queries run in your browser. This policy describes the information we collect when you use the site, including Google sign-in.",
    ],
  },
  {
    title: "What we collect",
    body: [
      "If you practice without an account, solved problems and editor drafts stay in your browser (local storage). We do not receive that data unless you later sign in and we sync guest progress you choose to keep.",
      "If you sign in with Google, we receive your Google account name and email address so we can create a KillSQL profile. You can pick a username and avatar. Email is stored privately and is not shown on public profiles or the leaderboard.",
      "If you use optional email/password or GitHub sign-in, we store the identifier those providers give us, plus the same profile fields.",
      "When you are signed in, we store which problems you solved, query attempts, streak data, and leaderboard stats so progress follows you across devices.",
      "If you donate, payment is processed by Dodo Payments. KillSQL does not store your full card number. Dodo may collect billing details required to complete the payment.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "We use this information to run the site: sign you in, save progress, show streaks and the leaderboard, send transactional mail if needed, and process optional donations.",
      "We do not sell your personal information. We do not use Google user data for ads.",
    ],
  },
  {
    title: "Who we share it with",
    body: [
      "Hosting and delivery: Vercel and Cloudflare, so the site can load.",
      "Accounts: Supabase, which stores profiles and progress.",
      "Sign-in: Google (and optionally GitHub) if you choose those providers.",
      "Donations: Dodo Payments if you donate.",
      "These providers process data only to provide their services to KillSQL.",
    ],
  },
  {
    title: "Cookies and similar storage",
    body: [
      "We use cookies or similar storage for authentication sessions. The browser also keeps guest progress locally until you sign in.",
    ],
  },
  {
    title: "How long we keep it",
    body: [
      "Account and progress data stay until you ask us to delete them, or until we shut down the service. You can email us to delete your account and associated profile data.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can use the site without an account. You can sign out at any time. To correct or delete your account data, email support@killsql.org from the address on the account.",
    ],
  },
  {
    title: "Children",
    body: [
      "KillSQL is not directed at children under 13. If you believe we have collected data from a child under 13, contact us and we will delete it.",
    ],
  },
  {
    title: "Changes",
    body: [
      "If this policy changes in a material way, we will update this page and the date below.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions about privacy: support@killsql.org.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-lime-400">Legal</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">Privacy policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated 27 September 2026</p>
      <p className="mt-6 text-sm leading-6 text-zinc-400">
        This page is the privacy policy for{" "}
        <Link href="/" className="text-lime-300 hover:underline">
          www.killsql.org
        </Link>
        . It covers Google sign-in and the rest of the site.
      </p>
      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-zinc-100">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-6 text-zinc-400">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
