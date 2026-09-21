"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

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
          <code>apps/web/.env.local</code>, then apply{" "}
          <code>supabase/migrations/</code>. You can still solve problems without an account.
        </p>
      </div>
    );
  }

  async function oauth(provider: "google" | "github") {
    const supabase = createClient();
    if (!supabase) return;
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
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
        router.push("/welcome");
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
      <Button className="mt-6 w-full" disabled={busy} onClick={() => void oauth("google")}>
        <GoogleIcon />
        Continue with Google
      </Button>
      <Button
        className="mt-3 w-full"
        variant="secondary"
        disabled={busy}
        onClick={() => void oauth("github")}
      >
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
