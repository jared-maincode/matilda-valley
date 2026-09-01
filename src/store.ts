import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Phase = "intro" | "playing" | "paused" | "won";
export type ShardId = "signal" | "resonance" | "memory";

export const FRAGMENTS_PER_SHARD = 3;
export const TOTAL_FRAGMENTS = FRAGMENTS_PER_SHARD * 3;

interface GameState {
  phase: Phase;
  shards: Record<ShardId, boolean>;
  fragmentsByShard: Record<ShardId, number>;
  bonusFragments: number;
  collectedFragmentIds: number[];
  focus: string | null;
  prompt: string;
  fragmentLore: string | null;
  resetNonce: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  setFocus: (id: string | null, prompt: string) => void;
  restoreShard: (id: ShardId) => void;
  collectFragmentForShard: (shard: ShardId, id: number, lore: string) => void;
  collectBonusFragment: (id: number, lore: string) => void;
  clearFragmentLore: () => void;
  quitToTitle: () => void;
  resetProgress: () => void;
  restart: () => void;
  isShardUnlocked: (id: ShardId) => boolean;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      phase: "intro",
      shards: { signal: false, resonance: false, memory: false },
      fragmentsByShard: { signal: 0, resonance: 0, memory: 0 },
      bonusFragments: 0,
      collectedFragmentIds: [],
      focus: null,
      prompt: "",
      fragmentLore: null,
      resetNonce: 0,
      start: () => set({ phase: "playing" }),
      pause: () => {
        if (get().phase === "playing") set({ phase: "paused" });
      },
      resume: () => {
        if (get().phase === "paused") set({ phase: "playing" });
      },
      setFocus: (id, prompt) => {
        const prev = get().focus;
        if (prev !== id || (id !== null && get().prompt !== prompt)) {
          set({ focus: id, prompt });
        }
      },
      restoreShard: (id) => {
        if (get().shards[id]) return;
        const shards = { ...get().shards, [id]: true };
        const allRestored = Object.values(shards).every(Boolean);
        set({
          shards,
          phase: allRestored ? "won" : "playing",
        });
      },
      collectFragmentForShard: (shard, id, lore) =>
        set((s) => {
          const current = s.fragmentsByShard[shard];
          if (current >= FRAGMENTS_PER_SHARD) return s;
          if (s.collectedFragmentIds.includes(id)) return s;
          return {
            fragmentsByShard: { ...s.fragmentsByShard, [shard]: current + 1 },
            collectedFragmentIds: [...s.collectedFragmentIds, id],
            fragmentLore: lore,
          };
        }),
      collectBonusFragment: (id, lore) =>
        set((s) => {
          if (s.collectedFragmentIds.includes(id)) return s;
          return {
            bonusFragments: s.bonusFragments + 1,
            collectedFragmentIds: [...s.collectedFragmentIds, id],
            fragmentLore: lore,
          };
        }),
      clearFragmentLore: () => set({ fragmentLore: null }),
      quitToTitle: () => set({ phase: "intro" }),
      resetProgress: () =>
        set((s) => ({
          phase: "intro",
          shards: { signal: false, resonance: false, memory: false },
          fragmentsByShard: { signal: 0, resonance: 0, memory: 0 },
          bonusFragments: 0,
          collectedFragmentIds: [],
          focus: null,
          prompt: "",
          fragmentLore: null,
          resetNonce: s.resetNonce + 1,
        })),
      restart: () => {
        get().resetProgress();
        set({ phase: "playing" });
      },
      isShardUnlocked: (id) => get().fragmentsByShard[id] >= FRAGMENTS_PER_SHARD,
    }),
    {
      name: "matilda-valley-save",
      partialize: (state) => ({
        shards: state.shards,
        fragmentsByShard: state.fragmentsByShard,
        bonusFragments: state.bonusFragments,
        collectedFragmentIds: state.collectedFragmentIds,
      }),
    },
  ),
);
