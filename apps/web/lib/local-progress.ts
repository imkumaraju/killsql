import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LocalAttempt = {
  status: "pass" | "fail";
  sql: string;
  at: number;
};

const MAX_ATTEMPTS = 8;

type ProgressState = {
  solved: string[];
  lastSlug: string | null;
  attempts: Record<string, LocalAttempt[]>;
  markVisited: (slug: string) => void;
  markSolved: (slug: string) => void;
  recordAttempt: (slug: string, attempt: Omit<LocalAttempt, "at">) => void;
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      solved: [],
      lastSlug: null,
      attempts: {},
      markVisited: (slug) => set({ lastSlug: slug }),
      markSolved: (slug) =>
        set((state) =>
          state.solved.includes(slug) ? state : { solved: [...state.solved, slug] },
        ),
      recordAttempt: (slug, attempt) =>
        set((state) => {
          const previous = state.attempts[slug] ?? [];
          const latest = previous[0];
          if (latest && latest.status === attempt.status && latest.sql === attempt.sql) {
            return state;
          }
          return {
            attempts: {
              ...state.attempts,
              [slug]: [{ ...attempt, at: Date.now() }, ...previous].slice(0, MAX_ATTEMPTS),
            },
          };
        }),
    }),
    { name: "killsql-progress" },
  ),
);

export function mergeSolved(serverSlugs: string[] | undefined, localSlugs: string[]) {
  return new Set([...(serverSlugs ?? []), ...localSlugs]);
}
