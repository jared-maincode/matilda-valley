import { describe, it, expect } from "vitest";
import { generateFragments } from "./fragments";
import { PUZZLE_POSITIONS, WATER_LEVEL } from "../constants";
import { terrainHeight } from "./terrain";

describe("generateFragments", () => {
  const fragments = generateFragments();

  describe("count and ids", () => {
    it("generates 11 fragments (9 standard + 2 bonus)", () => {
      expect(fragments).toHaveLength(11);
    });

    it("assigns unique ids", () => {
      const ids = fragments.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("assigns sequential ids starting from 0", () => {
      const ids = fragments.map((f) => f.id).sort((a, b) => a - b);
      expect(ids).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  describe("standard fragments", () => {
    const standard = fragments.filter((f) => !f.bonus);

    it("generates 9 standard fragments", () => {
      expect(standard).toHaveLength(9);
    });

    it("assigns each fragment to a shard", () => {
      for (const f of standard) {
        expect(f.shard).toBeDefined();
        expect(["signal", "resonance", "memory"]).toContain(f.shard);
      }
    });

    it("generates 3 fragments per shard", () => {
      const counts: Record<string, number> = {};
      for (const f of standard) {
        const key = f.shard!;
        counts[key] = (counts[key] ?? 0) + 1;
      }
      expect(counts.signal).toBe(3);
      expect(counts.resonance).toBe(3);
      expect(counts.memory).toBe(3);
    });

    it("positions fragments near their puzzle location", () => {
      for (const f of standard) {
        const px = PUZZLE_POSITIONS[f.shard!];
        const dist = Math.sqrt(
          (f.position[0] - px[0]) ** 2 + (f.position[2] - px[2]) ** 2,
        );
        expect(dist).toBeGreaterThan(10);
        expect(dist).toBeLessThan(25);
      }
    });

    it("places fragments above terrain", () => {
      for (const f of standard) {
        const groundH = terrainHeight(f.position[0], f.position[2]);
        expect(f.position[1]).toBeGreaterThan(groundH);
      }
    });

    it("places non-bonus fragments on dry ground above water level", () => {
      for (const f of standard) {
        const groundH = terrainHeight(f.position[0], f.position[2]);
        expect(groundH).toBeGreaterThanOrEqual(WATER_LEVEL);
      }
    });
  });

  describe("bonus fragments", () => {
    const bonus = fragments.filter((f) => f.bonus);

    it("generates 2 bonus fragments", () => {
      expect(bonus).toHaveLength(2);
    });

    it("does not assign a shard to bonus fragments", () => {
      for (const f of bonus) {
        expect(f.shard).toBeUndefined();
      }
    });

    it("places bonus fragments below surrounding terrain", () => {
      for (const f of bonus) {
        const groundH = terrainHeight(f.position[0], f.position[2]);
        // Bonus fragments are positioned at terrainHeight - 0.5
        expect(f.position[1]).toBeLessThan(groundH);
      }
    });
  });

  describe("lore text", () => {
    it("every fragment has non-empty lore", () => {
      for (const f of fragments) {
        expect(f.lore).toBeTruthy();
        expect(f.lore.length).toBeGreaterThan(10);
      }
    });
  });
});
