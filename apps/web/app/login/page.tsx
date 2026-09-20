"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Auth is not configured</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Add <code className="text-lime-300">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-lime-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code>apps/web/.env.local</code>,           then apply{" "}
          <code>supabase/migrations/001_initial.sql</code> and{" "}
          <code>002_streaks.sql</code>. You can still solve problems without an
          account.
        </p>
      </div>
    );
  }

  async function github() {
    const supabase = createClient();
    if (!supabase) return;
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }

  async function emailAuth(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm the account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/problems");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not authenticate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Save submissions, track streaks, and appear on the leaderboard. Solving still happens in
        the browser.
      </p>
      <Button className="mt-6 w-full" onClick={() => void github()}>
        <Github className="h-4 w-4" />
        Continue with GitHub
      </Button>
      <div className="my-6 text-center text-xs uppercase tracking-wider text-zinc-500">or email</div>
      <form className="space-y-3" onSubmit={(event) => void emailAuth(event)}>
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button className="w-full" disabled={busy}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <button
        className="mt-4 text-sm text-zinc-400 hover:text-zinc-200"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
      {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}
    </div>
  );
}
