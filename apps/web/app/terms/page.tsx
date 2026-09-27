import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Terms for using KillSQL, the free SQL practice site.",
};

const sections = [
  {
    title: "Agreement",
    body: [
      "By using KillSQL (killsql.org), you agree to these terms. If you do not agree, do not use the site.",
    ],
  },
  {
    title: "The service",
    body: [
      "KillSQL is a free site for practicing SQL in your browser. We may change, pause, or stop the service at any time.",
      "Practice queries run on your device. An account is optional. Signed-in progress, streaks, and the leaderboard need a working account and our servers.",
    ],
  },
  {
    title: "Accounts",
    body: [
      "You are responsible for the Google, GitHub, or email account you use to sign in. Do not share your login. Usernames must not impersonate others or include illegal or abusive content. We may remove accounts or content that violate these terms.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Do not attack, scrape in a way that harms the service, attempt to access other users’ private data, or use KillSQL to break the law. Do not try to bypass rate limits, payment, or authentication.",
    ],
  },
  {
    title: "Donations",
    body: [
      "Donations are optional and do not buy extra product features. Payments are processed by Dodo Payments. Refunds, if any, follow Dodo’s process and applicable law. A donation does not create an employment, partnership, or equity relationship.",
    ],
  },
  {
    title: "Intellectual property",
    body: [
      "KillSQL’s name, site design, and original materials belong to us. Practice problems and code in the public GitHub repository are available under that repository’s license. You keep rights to SQL you write; you grant us a license to store it as needed to run the service (for example submissions and guest-progress sync).",
    ],
  },
  {
    title: "No warranty",
    body: [
      "The site is provided “as is.” Interview results, query correctness, and uptime are not guaranteed. DuckDB in the browser may differ from other SQL engines.",
    ],
  },
  {
    title: "Limitation of liability",
    body: [
      "To the fullest extent allowed by law, KillSQL and its operator are not liable for indirect, incidental, or consequential damages, or for lost data, progress, or donations beyond the amount you paid us in the 12 months before the claim (which is typically zero if you only used the free site).",
    ],
  },
  {
    title: "Privacy",
    body: [
      "How we handle personal data is described in the Privacy policy. Google sign-in is subject to Google’s terms as well as ours.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update these terms. Continued use after a change posted on this page means you accept the new terms.",
    ],
  },
  {
    title: "Contact",
    body: ["Questions: support@killsql.org."],
  },
] as const;

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-lime-400">Legal</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">Terms of service</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated 27 September 2026</p>
      <p className="mt-6 text-sm leading-6 text-zinc-400">
        These terms apply to{" "}
        <Link href="/" className="text-lime-300 hover:underline">
          www.killsql.org
        </Link>
        . See also the{" "}
        <Link href="/privacy" className="text-lime-300 hover:underline">
          Privacy policy
        </Link>
        .
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
