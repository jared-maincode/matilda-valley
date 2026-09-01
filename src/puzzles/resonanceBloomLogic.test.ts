import { describe, it, expect } from "vitest";
import {
  FORK_COUNT,
  PITCH_COUNT,
  generateTarget,
  generateInitial,
  cyclePitch,
  matchedCount,
  allMatched,
  randomPitch,
} from "./resonanceBloomLogic";

describe("resonanceBloomLogic", () => {
  describe("randomPitch", () => {
    it("returns a value within pitch range", () => {
      for (let i = 0; i < 100; i++) {
        const p = randomPitch();
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(PITCH_COUNT);
      }
    });
  });

  describe("generateTarget", () => {
    it("produces an array of FORK_COUNT pitches", () => {
      const target = generateTarget();
      expect(target).toHaveLength(FORK_COUNT);
      for (const p of target) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(PITCH_COUNT);
      }
    });
  });

  describe("generateInitial", () => {
    it("produces pitches that never match the target", () => {
      const target = [0, 1, 2, 0];
      const initial = generateInitial(target);
      expect(initial).toHaveLength(FORK_COUNT);
      for (let i = 0; i < FORK_COUNT; i++) {
        expect(initial[i]).not.toBe(target[i]);
      }
    });

    it("produces valid pitch values", () => {
      const target = generateTarget();
      const initial = generateInitial(target);
      for (const p of initial) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(PITCH_COUNT);
      }
    });
  });

  describe("cyclePitch", () => {
    it("increments the pitch at the given index", () => {
      const pitches = [0, 1, 2, 0];
      const result = cyclePitch(pitches, 1);
      expect(result).toEqual([0, 2, 2, 0]);
    });

    it("wraps from max pitch back to 0", () => {
      const pitches = [0, 2, 1, 0];
      const result = cyclePitch(pitches, 1);
      expect(result).toEqual([0, 0, 1, 0]);
    });

    it("does not mutate the original array", () => {
      const pitches = [0, 1, 2, 0];
      cyclePitch(pitches, 0);
      expect(pitches).toEqual([0, 1, 2, 0]);
    });

    it("only changes the targeted index", () => {
      const pitches = [1, 2, 0, 1];
      const result = cyclePitch(pitches, 2);
      expect(result).toEqual([1, 2, 1, 1]);
    });
  });

  describe("matchedCount", () => {
    it("counts matching positions correctly", () => {
      expect(matchedCount([0, 1, 2, 0], [0, 1, 2, 0])).toBe(4);
      expect(matchedCount([0, 1, 2, 0], [1, 0, 0, 1])).toBe(0);
      expect(matchedCount([0, 1, 2, 0], [0, 0, 2, 1])).toBe(2);
    });

    it("returns 0 for completely mismatched arrays", () => {
      expect(matchedCount([0, 0, 0, 0], [1, 1, 1, 1])).toBe(0);
    });

    it("returns FORK_COUNT for identical arrays", () => {
      const target = [2, 0, 1, 2];
      expect(matchedCount(target, target)).toBe(FORK_COUNT);
    });
  });

  describe("allMatched", () => {
    it("returns true when all pitches match", () => {
      const target = [0, 1, 2, 0];
      expect(allMatched(target, target)).toBe(true);
    });

    it("returns false when some pitches do not match", () => {
      const target = [0, 1, 2, 0];
      expect(allMatched([0, 0, 2, 0], target)).toBe(false);
    });

    it("returns false when no pitches match", () => {
      const target = [0, 1, 2, 0];
      expect(allMatched([1, 0, 0, 1], target)).toBe(false);
    });
  });
});
