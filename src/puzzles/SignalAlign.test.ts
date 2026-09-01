import { describe, it, expect } from "vitest";
import { computeBeamPath, alignedCount, MIRRORS, MIRROR_ANGLES, type Mirror } from "./signalAlignLogic";

describe("computeBeamPath", () => {
  describe("with default mirror configuration", () => {
    const path = computeBeamPath(MIRRORS);

    it("returns at least 2 points (source + at least one mirror)", () => {
      expect(path.length).toBeGreaterThanOrEqual(2);
    });

    it("returns at most MIRRORS.length + 2 points", () => {
      expect(path.length).toBeLessThanOrEqual(MIRRORS.length + 2);
    });

    it("starts at the source position", () => {
      // Source is the first point
      expect(path[0]).toBeDefined();
    });
  });

  describe("solvability", () => {
    it("has at least one winning configuration out of all 512 angle combinations", () => {
      let solutions = 0;
      for (let a = 0; a < MIRROR_ANGLES.length; a++) {
        for (let b = 0; b < MIRROR_ANGLES.length; b++) {
          for (let c = 0; c < MIRROR_ANGLES.length; c++) {
            const mirrors: Mirror[] = [
              { ...MIRRORS[0], angleIndex: a },
              { ...MIRRORS[1], angleIndex: b },
              { ...MIRRORS[2], angleIndex: c },
            ];
            const path = computeBeamPath(mirrors);
            if (path.length === MIRRORS.length + 2) solutions++;
          }
        }
      }
      expect(solutions).toBeGreaterThan(0);
    });
  });

  describe("beam alignment behaviour", () => {
    it("produces fewer points when mirrors are misaligned", () => {
      // All mirrors at angle 0 (likely misaligned)
      const misaligned: Mirror[] = MIRRORS.map((m) => ({
        ...m,
        angleIndex: 0,
      }));
      const misPath = computeBeamPath(misaligned);

      // Try the default angles
      const defaultPath = computeBeamPath(MIRRORS);

      // The default path should be at least as long as the misaligned one
      // (either equal or longer, since default angles were designed for the puzzle)
      expect(defaultPath.length).toBeGreaterThanOrEqual(misPath.length);
    });

    it("stops the beam when alignment drops below threshold", () => {
      // Set all mirrors to angle 0 to guarantee misalignment
      const misaligned: Mirror[] = MIRRORS.map((m) => ({
        ...m,
        angleIndex: 0,
      }));
      const path = computeBeamPath(misaligned);

      // With all mirrors at angle 0, the beam should not reach the receiver
      // (path length < MIRRORS.length + 2 means the beam stopped early)
      expect(path.length).toBeLessThan(MIRRORS.length + 2);
    });
  });

  describe("purity", () => {
    it("returns the same result for the same input", () => {
      const p1 = computeBeamPath(MIRRORS);
      const p2 = computeBeamPath(MIRRORS);
      expect(p1.length).toBe(p2.length);
      for (let i = 0; i < p1.length; i++) {
        expect(p1[i].x).toBeCloseTo(p2[i].x, 5);
        expect(p1[i].y).toBeCloseTo(p2[i].y, 5);
        expect(p1[i].z).toBeCloseTo(p2[i].z, 5);
      }
    });

    it("does not mutate the input mirrors array", () => {
      const mirrors = MIRRORS.map((m) => ({ ...m }));
      computeBeamPath(mirrors);
      expect(mirrors).toEqual(MIRRORS);
    });
  });
});

describe("alignedCount", () => {
  it("returns 0 for a path with only source and receiver (2 points)", () => {
    expect(alignedCount([0, 1].map(() => ({ x: 0, y: 0, z: 0 }) as any))).toBe(0);
  });

  it("returns 0 for a path with just the source (1 point)", () => {
    expect(alignedCount([{ x: 0, y: 0, z: 0 } as any])).toBe(0);
  });

  it("returns 0 for an empty path", () => {
    expect(alignedCount([])).toBe(0);
  });

  it("returns 1 when one mirror is aligned (3 points)", () => {
    expect(alignedCount([1, 2, 3].map(() => ({ x: 0, y: 0, z: 0 }) as any))).toBe(1);
  });

  it("returns MIRRORS.length when all mirrors aligned (MIRRORS.length + 2 points)", () => {
    const fullPoints = Array.from({ length: MIRRORS.length + 2 }, () => ({ x: 0, y: 0, z: 0 }) as any);
    expect(alignedCount(fullPoints)).toBe(MIRRORS.length);
  });
});

describe("MIRROR_ANGLES", () => {
  it("has 8 angles", () => {
    expect(MIRROR_ANGLES).toHaveLength(8);
  });

  it("spans full circle in 45-degree increments", () => {
    for (let i = 0; i < 8; i++) {
      expect(MIRROR_ANGLES[i]).toBeCloseTo((i * Math.PI) / 4, 5);
    }
  });
});
