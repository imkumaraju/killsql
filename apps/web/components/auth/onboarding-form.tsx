"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { canonicalizeAvatarUrl, DEFAULT_AVATAR, PRESET_AVATARS } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/client";
import { sanitizeUsername, usernameIssue } from "@/lib/username";
import { cn } from "@/lib/utils";

type Props = {
  assignedUsername: string;
  displayName: string | null;
  email: string | null;
  currentAvatar: string;
  providerAvatar: string | null;
};

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export function OnboardingForm({
  assignedUsername,
  displayName,
  email,
  currentAvatar,
  providerAvatar,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(assignedUsername);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || DEFAULT_AVATAR);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const issue = usernameIssue(username);
  const previewLabel = username || assignedUsername;

  const choices = useMemo(() => {
    const items = [
      { src: DEFAULT_AVATAR, label: "Default" },
      ...PRESET_AVATARS.map((avatar) => ({ src: avatar.src, label: avatar.label })),
    ];
    if (providerAvatar) {
      items.unshift({ src: providerAvatar, label: "Account photo" });
    }
    return items;
  }, [providerAvatar]);

  async function finish(skip: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      if (!skip && issue) {
        setMessage(issue);
        return;
      }
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          skip
            ? { skip: true }
            : { username: username.trim(), avatar_url: canonicalizeAvatarUrl(avatarUrl) },
        ),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save profile");
      }
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      router.replace("/problems");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      setMessage("Images must be 2 MB or smaller.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage("Choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setMessage("Auth is not configured.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar.${ext === "jpg" ? "jpeg" : ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-lime-400">Welcome</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Set up your profile</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Pick a username and a picture. You can skip either — we will assign a handle and the default
        avatar.
      </p>

      {displayName || email ? (
        <p className="mt-4 text-sm text-zinc-300">
          Signed in
          {displayName ? ` as ${displayName}` : ""}
          {email ? (
            <>
              {" "}
              <span className="text-zinc-500">({email})</span>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="mt-8 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl} alt={previewLabel} />
          <AvatarFallback>{previewLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-medium">@{previewLabel}</p>
          <p className="text-xs text-zinc-500">This is how you appear on the leaderboard.</p>
        </div>
      </div>

      <label className="mt-8 block text-sm font-medium text-zinc-200">
        Username
        <Input
          className="mt-2"
          value={username}
          autoComplete="username"
          spellCheck={false}
          maxLength={24}
          placeholder={assignedUsername}
          onChange={(event) => setUsername(sanitizeUsername(event.target.value))}
        />
      </label>
      <p className="mt-1.5 text-xs text-zinc-500">
        3–24 characters, lowercase letters, numbers, underscore. Leave it as-is to keep{" "}
        <span className="text-zinc-300">@{assignedUsername}</span>.
      </p>
      {issue ? <p className="mt-1 text-xs text-amber-200">{issue}</p> : null}

      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-200">Avatar</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Upload photo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onUpload(file);
            }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">PNG, JPEG, WebP, or GIF up to 2 MB — or pick one below.</p>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {choices.map((choice) => {
            const selected = avatarUrl.split("?")[0] === choice.src.split("?")[0];
            return (
              <button
                key={choice.src}
                type="button"
                title={choice.label}
                onClick={() => setAvatarUrl(choice.src)}
                className={cn(
                  "overflow-hidden rounded-xl border bg-zinc-900 p-0.5 transition",
                  selected
                    ? "border-lime-400 ring-2 ring-lime-400/40"
                    : "border-zinc-800 hover:border-zinc-600",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={choice.src} alt={choice.label} className="aspect-square w-full rounded-lg object-cover" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button disabled={busy || Boolean(issue)} onClick={() => void finish(false)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void finish(true)}>
          Skip for now
        </Button>
      </div>
      {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}
    </div>
  );
}
