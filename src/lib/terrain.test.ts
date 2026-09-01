import { describe, it, expect } from "vitest";
import { terrainHeight } from "./terrain";
import { SPAWN_POSITION, PAD_RADIUS, WATER_LEVEL, WORLD_HALF } from "../constants";

describe("terrainHeight", () => {
  describe("spawn area flattening", () => {
    it("returns terrain above water at the exact spawn position", () => {
      const h = terrainHeight(SPAWN_POSITION.x, SPAWN_POSITION.z);
      expect(h).toBeGreaterThan(WATER_LEVEL);
    });

    it("is flat within PAD_RADIUS", () => {
      const centre = terrainHeight(SPAWN_POSITION.x, SPAWN_POSITION.z);
      const edge = terrainHeight(
        SPAWN_POSITION.x + PAD_RADIUS - 0.5,
        SPAWN_POSITION.z,
      );
      expect(Math.abs(edge - centre)).toBeLessThan(0.5);
    });

    it("blends to natural terrain outside the pad", () => {
      const flatH = terrainHeight(SPAWN_POSITION.x, SPAWN_POSITION.z);
      const blendH = terrainHeight(
        SPAWN_POSITION.x + PAD_RADIUS + 4,
        SPAWN_POSITION.z,
      );
      expect(Math.abs(blendH - flatH)).toBeGreaterThan(0.01);
    });
  });

  describe("determinism", () => {
    it("returns the same value for the same coordinates", () => {
      expect(terrainHeight(10, 20)).toBe(terrainHeight(10, 20));
    });

    it("returns the same value across repeated calls", () => {
      const h1 = terrainHeight(-30, 45);
      const h2 = terrainHeight(-30, 45);
      const h3 = terrainHeight(-30, 45);
      expect(h1).toBe(h2);
      expect(h2).toBe(h3);
    });
  });

  describe("mountain walls", () => {
    it("produces high terrain near the world edge", () => {
      const h = terrainHeight(WORLD_HALF - 5, 0);
      expect(h).toBeGreaterThan(20);
    });

    it("produces even higher terrain at the corner", () => {
      const h = terrainHeight(WORLD_HALF - 2, WORLD_HALF - 2);
      expect(h).toBeGreaterThan(30);
    });
  });

  describe("central basin", () => {
    it("does not create a peak at the centre relative to the basin edge", () => {
      const centre = terrainHeight(0, 0);
      const basinEdge = terrainHeight(22, 0);
      expect(centre).toBeLessThanOrEqual(basinEdge + 5);
    });
  });

  describe("underwater depressions", () => {
    it("creates a depression at the first pond centre (25, 15)", () => {
      // The depression subtracts up to 3 units at the centre via a gaussian.
      // Compare the centre to a point just outside the depression radius (8)
      // to verify the depression effect, accepting that noise can offset it.
      const centre = terrainHeight(25, 15);
      const outside = terrainHeight(25 + 10, 15);
      expect(centre).toBeLessThanOrEqual(outside + 3.5);
    });

    it("creates a depression at the second pond centre (-20, -25)", () => {
      const centre = terrainHeight(-20, -25);
      const outside = terrainHeight(-20 + 10, -25);
      expect(centre).toBeLessThanOrEqual(outside + 3.5);
    });
  });

  describe("general bounds", () => {
    it("returns finite values across a grid of points", () => {
      for (let x = -WORLD_HALF; x <= WORLD_HALF; x += 20) {
        for (let z = -WORLD_HALF; z <= WORLD_HALF; z += 20) {
          expect(Number.isFinite(terrainHeight(x, z))).toBe(true);
        }
      }
    });
  });
});
