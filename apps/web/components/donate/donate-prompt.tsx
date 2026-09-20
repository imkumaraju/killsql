"use client";

import { Heart } from "lucide-react";
import { useRef, useState } from "react";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DONATE_DEFAULT_CENTS,
  DONATE_MAX_CENTS,
  DONATE_MIN_CENTS,
  DONATE_PRESETS_CENTS,
  formatDonateDollars,
  hideDonateForToday,
  parseDollarInput,
} from "@/lib/donate";
import { cn } from "@/lib/utils";

type DonatePromptState = {
  open: boolean;
  openPrompt: () => void;
  setOpen: (open: boolean) => void;
};

export const useDonatePrompt = create<DonatePromptState>((set) => ({
  open: false,
  openPrompt: () => set({ open: true }),
  setOpen: (open) => set({ open }),
}));

export function DonatePrompt() {
  const open = useDonatePrompt((state) => state.open);
  const setOpen = useDonatePrompt((state) => state.setOpen);
  const hideTodayRef = useRef(false);

  function dismiss() {
    if (hideTodayRef.current) hideDonateForToday();
    hideTodayRef.current = false;
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="overflow-hidden">
        <DonatePromptBody
          key={open ? "open" : "closed"}
          onHideTodayChange={(value) => {
            hideTodayRef.current = value;
          }}
          onDismiss={dismiss}
        />
      </DialogContent>
    </Dialog>
  );
}

function DonatePromptBody({
  onHideTodayChange,
  onDismiss,
}: {
  onHideTodayChange: (value: boolean) => void;
  onDismiss: () => void;
}) {
  const [preset, setPreset] = useState<number | "custom">(DONATE_DEFAULT_CENTS);
  const [custom, setCustom] = useState("5");
  const [hideToday, setHideToday] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = preset === "custom" ? parseDollarInput(custom) : preset;
  const minDollars = DONATE_MIN_CENTS / 100;
  const maxDollars = DONATE_MAX_CENTS / 100;

  async function donate() {
    if (amountCents == null) {
      setError(`Enter an amount between $${minDollars} and $${maxDollars}.`);
      return;
    }

    setError(null);
    setSubmitting(true);
    hideDonateForToday();

    try {
      const returnPath = `${window.location.pathname}${window.location.search}`;
      const response = await fetch("/api/donate/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, returnPath }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Could not start checkout");
    }
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_rgba(190,242,100,0.16),_transparent_70%)]" />
      <div className="relative space-y-5">
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-lime-400/15 text-lime-400 ring-1 ring-lime-400/30">
            <Heart className="h-5 w-5 fill-current" />
          </span>
          <DialogTitle>Help keep KillSQL free</DialogTitle>
          <DialogDescription className="mt-2 max-w-sm">
            KillSQL stays free because of people like you. A small donation keeps hosting,
            domains, and new problems going — so anyone can keep practicing SQL.
          </DialogDescription>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DONATE_PRESETS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => {
                setPreset(cents);
                setCustom(String(cents / 100));
                setError(null);
              }}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors",
                preset === cents
                  ? "border-lime-400 bg-lime-400 text-zinc-950"
                  : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500",
              )}
            >
              {formatDonateDollars(cents)}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="donate-custom-amount" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Or enter another amount (USD)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              $
            </span>
            <Input
              id="donate-custom-amount"
              inputMode="decimal"
              placeholder={`${minDollars}–${maxDollars}`}
              value={custom}
              onFocus={() => setPreset("custom")}
              onChange={(event) => {
                setPreset("custom");
                setCustom(event.target.value);
                setError(null);
              }}
              className="pl-7"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={() => void donate()} disabled={submitting}>
            {submitting
              ? "Redirecting…"
              : amountCents != null
                ? `Donate ${formatDonateDollars(amountCents)}`
                : "Donate"}
          </Button>
          <Button variant="ghost" onClick={onDismiss} disabled={submitting}>
            Skip
          </Button>
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-left text-sm text-zinc-400">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-lime-400"
            checked={hideToday}
            onChange={(event) => {
              const checked = event.target.checked;
              setHideToday(checked);
              onHideTodayChange(checked);
            }}
          />
          Don&apos;t show this again today
        </label>
      </div>
    </>
  );
}
