import { describe, it, expect, beforeEach } from "vitest";
import { useGame, FRAGMENTS_PER_SHARD } from "./store";

function getState() {
  return useGame.getState();
}

function resetStore() {
  useGame.setState({
    phase: "intro",
    shards: { signal: false, resonance: false, memory: false },
    fragmentsByShard: { signal: 0, resonance: 0, memory: 0 },
    bonusFragments: 0,
    collectedFragmentIds: [],
    focus: null,
    prompt: "",
    fragmentLore: null,
    resetNonce: 0,
  });
}

describe("store", () => {
  beforeEach(() => resetStore());

  describe("initial state", () => {
    it("starts in intro phase", () => {
      expect(getState().phase).toBe("intro");
    });

    it("has no shards restored", () => {
      expect(getState().shards).toEqual({
        signal: false,
        resonance: false,
        memory: false,
      });
    });

    it("has zero fragments across all shards", () => {
      expect(getState().fragmentsByShard).toEqual({
        signal: 0,
        resonance: 0,
        memory: 0,
      });
    });
  });

  describe("start", () => {
    it("transitions from intro to playing", () => {
      getState().start();
      expect(getState().phase).toBe("playing");
    });
  });

  describe("pause / resume", () => {
    it("pauses from playing", () => {
      getState().start();
      getState().pause();
      expect(getState().phase).toBe("paused");
    });

    it("does not pause from intro", () => {
      getState().pause();
      expect(getState().phase).toBe("intro");
    });

    it("does not pause from paused", () => {
      getState().start();
      getState().pause();
      getState().pause();
      expect(getState().phase).toBe("paused");
    });

    it("resumes from paused to playing", () => {
      getState().start();
      getState().pause();
      getState().resume();
      expect(getState().phase).toBe("playing");
    });

    it("does not resume from playing", () => {
      getState().start();
      getState().resume();
      expect(getState().phase).toBe("playing");
    });
  });

  describe("collectFragmentForShard", () => {
    it("increments the shard fragment count", () => {
      getState().collectFragmentForShard("signal", 0, "lore 0");
      expect(getState().fragmentsByShard.signal).toBe(1);
    });

    it("records the fragment id", () => {
      getState().collectFragmentForShard("signal", 0, "lore 0");
      expect(getState().collectedFragmentIds).toContain(0);
    });

    it("sets fragmentLore", () => {
      getState().collectFragmentForShard("signal", 0, "lore text");
      expect(getState().fragmentLore).toBe("lore text");
    });

    it("is idempotent for the same fragment id", () => {
      getState().collectFragmentForShard("signal", 0, "lore 0");
      getState().collectFragmentForShard("signal", 0, "lore 0 dup");
      expect(getState().fragmentsByShard.signal).toBe(1);
      expect(getState().collectedFragmentIds).toHaveLength(1);
    });

    it("caps at FRAGMENTS_PER_SHARD", () => {
      for (let i = 0; i < FRAGMENTS_PER_SHARD + 2; i++) {
        getState().collectFragmentForShard("signal", i, `lore ${i}`);
      }
      expect(getState().fragmentsByShard.signal).toBe(FRAGMENTS_PER_SHARD);
    });

    it("tracks multiple shards independently", () => {
      getState().collectFragmentForShard("signal", 0, "s0");
      getState().collectFragmentForShard("signal", 1, "s1");
      getState().collectFragmentForShard("resonance", 3, "r0");
      expect(getState().fragmentsByShard.signal).toBe(2);
      expect(getState().fragmentsByShard.resonance).toBe(1);
      expect(getState().fragmentsByShard.memory).toBe(0);
    });
  });

  describe("collectBonusFragment", () => {
    it("increments bonusFragments", () => {
      getState().collectBonusFragment(100, "bonus lore");
      expect(getState().bonusFragments).toBe(1);
    });

    it("is idempotent for the same id", () => {
      getState().collectBonusFragment(100, "bonus lore");
      getState().collectBonusFragment(100, "dup");
      expect(getState().bonusFragments).toBe(1);
    });

    it("sets fragmentLore", () => {
      getState().collectBonusFragment(100, "bonus text");
      expect(getState().fragmentLore).toBe("bonus text");
    });
  });

  describe("isShardUnlocked", () => {
    it("returns false below threshold", () => {
      getState().collectFragmentForShard("signal", 0, "lore");
      expect(getState().isShardUnlocked("signal")).toBe(false);
    });

    it("returns true at FRAGMENTS_PER_SHARD", () => {
      for (let i = 0; i < FRAGMENTS_PER_SHARD; i++) {
        getState().collectFragmentForShard("signal", i, `lore ${i}`);
      }
      expect(getState().isShardUnlocked("signal")).toBe(true);
    });
  });

  describe("restoreShard", () => {
    it("sets the shard to true", () => {
      getState().restoreShard("signal");
      expect(getState().shards.signal).toBe(true);
    });

    it("keeps phase as playing when not all shards restored", () => {
      getState().start();
      getState().restoreShard("signal");
      expect(getState().phase).toBe("playing");
    });

    it("transitions to won when all three shards restored", () => {
      getState().start();
      getState().restoreShard("signal");
      getState().restoreShard("resonance");
      getState().restoreShard("memory");
      expect(getState().phase).toBe("won");
    });

    it("is idempotent", () => {
      getState().start();
      getState().restoreShard("signal");
      getState().restoreShard("signal");
      expect(getState().shards.signal).toBe(true);
    });

    it("does not trigger win when restoring already-restored shard", () => {
      getState().start();
      getState().restoreShard("signal");
      getState().restoreShard("signal");
      getState().restoreShard("resonance");
      expect(getState().phase).toBe("playing");
    });
  });

  describe("clearFragmentLore", () => {
    it("clears fragmentLore", () => {
      getState().collectFragmentForShard("signal", 0, "lore");
      getState().clearFragmentLore();
      expect(getState().fragmentLore).toBeNull();
    });
  });

  describe("setFocus", () => {
    it("sets focus id and prompt", () => {
      getState().setFocus("mirror-0", "rotate mirror");
      expect(getState().focus).toBe("mirror-0");
      expect(getState().prompt).toBe("rotate mirror");
    });

    it("updates prompt when id is same but prompt differs", () => {
      getState().setFocus("mirror-0", "prompt A");
      getState().setFocus("mirror-0", "prompt B");
      expect(getState().prompt).toBe("prompt B");
    });

    it("does not update when id and prompt are same", () => {
      getState().setFocus("mirror-0", "prompt A");
      const before = getState();
      getState().setFocus("mirror-0", "prompt A");
      // prompt should be unchanged, no new state object issues
      expect(getState().prompt).toBe("prompt A");
      expect(getState()).toBe(before);
    });

    it("clears focus with null", () => {
      getState().setFocus("mirror-0", "rotate");
      getState().setFocus(null, "");
      expect(getState().focus).toBeNull();
    });
  });

  describe("resetProgress", () => {
    it("clears all progress", () => {
      getState().start();
      getState().collectFragmentForShard("signal", 0, "lore");
      getState().restoreShard("signal");
      getState().resetProgress();
      expect(getState().shards).toEqual({
        signal: false,
        resonance: false,
        memory: false,
      });
      expect(getState().fragmentsByShard).toEqual({
        signal: 0,
        resonance: 0,
        memory: 0,
      });
      expect(getState().collectedFragmentIds).toEqual([]);
      expect(getState().bonusFragments).toBe(0);
    });

    it("returns to intro phase", () => {
      getState().start();
      getState().resetProgress();
      expect(getState().phase).toBe("intro");
    });

    it("increments resetNonce", () => {
      const before = getState().resetNonce;
      getState().resetProgress();
      expect(getState().resetNonce).toBe(before + 1);
    });
  });

  describe("restart", () => {
    it("resets progress and goes to playing", () => {
      getState().start();
      getState().collectFragmentForShard("signal", 0, "lore");
      getState().restart();
      expect(getState().fragmentsByShard.signal).toBe(0);
      expect(getState().phase).toBe("playing");
    });

    it("increments resetNonce", () => {
      const before = getState().resetNonce;
      getState().restart();
      expect(getState().resetNonce).toBe(before + 1);
    });
  });

  describe("quitToTitle", () => {
    it("sets phase to intro", () => {
      getState().start();
      getState().quitToTitle();
      expect(getState().phase).toBe("intro");
    });
  });
});
