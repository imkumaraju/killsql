import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceState = {
  drafts: Record<string, string>;
  setDraft: (slug: string, sql: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (slug, sql) =>
        set((state) => ({ drafts: { ...state.drafts, [slug]: sql } })),
    }),
    { name: "killsql-drafts" },
  ),
);
