import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { OnboardingGate } from "@/components/auth/onboarding-gate";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KillSQL — SQL practice in your browser",
    template: "%s · KillSQL",
  },
  description:
    "Free SQL practice in your browser. Interview-style problems, instant feedback, and daily streaks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <Providers>
          <OnboardingGate />
          <SiteHeader />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          <footer className="border-t border-zinc-800/80 px-4 py-4 text-center text-xs text-zinc-500">
            <Link className="hover:text-zinc-300" href="/privacy">
              Privacy
            </Link>
            <span className="mx-2 text-zinc-700">·</span>
            <Link className="hover:text-zinc-300" href="/terms">
              Terms
            </Link>
            <span className="mx-2 text-zinc-700">·</span>
            <a className="hover:text-zinc-300" href="mailto:support@killsql.org">
              support@killsql.org
            </a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
