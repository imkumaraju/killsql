"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { GuestProgressSync } from "@/components/auth/guest-progress-sync";
import { TooltipProvider } from "@/components/ui/tooltip";

function isResizeObserverNoise(message: string | undefined) {
  return Boolean(message?.includes("ResizeObserver"));
}

if (typeof window !== "undefined") {
  window.addEventListener(
    "error",
    (event) => {
      if (!isResizeObserverNoise(event.message)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      if (!isResizeObserverNoise(message)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={200}>
        <GuestProgressSync />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
