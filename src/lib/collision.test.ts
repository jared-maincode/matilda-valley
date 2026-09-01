import { describe, it, expect } from "vitest";
import { registerSolid, resolveCollision } from "./collision";

describe("resolveCollision", () => {
  it("returns original position when no solids registered", () => {
    const [x, z] = resolveCollision(10, 20);
    expect(x).toBe(10);
    expect(z).toBe(20);
  });

  it("pushes player out of a cylindrical solid", () => {
    const unreg = registerSolid("test-cyl", 0, 0, 2);
    try {
      const [x, z] = resolveCollision(1, 0);
      const dist = Math.sqrt(x * x + z * z);
      expect(dist).toBeGreaterThanOrEqual(2.7);
      expect(x).toBeGreaterThan(1);
      expect(z).toBeCloseTo(0);
    } finally {
      unreg();
    }
  });

  it("does not push when already outside the solid", () => {
    const unreg = registerSolid("test-outside", 0, 0, 2);
    try {
      const [x, z] = resolveCollision(10, 10);
      expect(x).toBe(10);
      expect(z).toBe(10);
    } finally {
      unreg();
    }
  });

  it("respects custom padding", () => {
    const unreg = registerSolid("test-padding", 0, 0, 2);
    try {
      const [x, z] = resolveCollision(1, 0, undefined, 2.0);
      const dist = Math.sqrt(x * x + z * z);
      // radius(2) + padding(2) = 4
      expect(dist).toBeGreaterThanOrEqual(3.9);
    } finally {
      unreg();
    }
  });

  it("pushes along the correct diagonal direction", () => {
    const unreg = registerSolid("test-diag", 0, 0, 1);
    try {
      const [x, z] = resolveCollision(0.5, 0.5);
      // Should be pushed outward along the diagonal
      expect(x).toBeGreaterThan(0.5);
      expect(z).toBeGreaterThan(0.5);
      // The push should be symmetric
      expect(x).toBeCloseTo(z, 5);
    } finally {
      unreg();
    }
  });

  it("handles multiple solids", () => {
    const unreg1 = registerSolid("test-multi-1", -5, 0, 1);
    const unreg2 = registerSolid("test-multi-2", 5, 0, 1);
    try {
      // Between the two solids, outside both
      const [x, z] = resolveCollision(0, 0);
      expect(x).toBe(0);
      expect(z).toBe(0);

      // Inside the first solid at (-5, 0), pushed away toward 0
      const [x2] = resolveCollision(-4.5, 0);
      expect(x2).toBeGreaterThan(-4.5);
    } finally {
      unreg1();
      unreg2();
    }
  });

  it("testing cone collision narrows radius at height", () => {
    const unreg = registerSolid("test-cone", 0, 0, 4, "cone", 0, 8);
    try {
      // At base level (y=0), full radius applies
      const [xLow] = resolveCollision(1, 0, 0);
      expect(xLow).toBeGreaterThan(1);

      // At half height, radius is halved
      const [xMid] = resolveCollision(1, 0, 4);
      expect(xMid).toBeGreaterThan(1);
      // Mid should be pushed less than low (smaller effective radius)
      expect(xMid).toBeLessThan(xLow);

      // Above the cone, no collision
      const [xTop] = resolveCollision(0.5, 0, 9);
      expect(xTop).toBe(0.5);
    } finally {
      unreg();
    }
  });

  it("skips cone collision when above cone height", () => {
    const unreg = registerSolid("test-cone-above", 0, 0, 4, "cone", 0, 5);
    try {
      const [x, z] = resolveCollision(0, 0, 10);
      expect(x).toBe(0);
      expect(z).toBe(0);
    } finally {
      unreg();
    }
  });

  it("registering same id replaces the solid", () => {
    const unreg1 = registerSolid("test-replace", 0, 0, 2);
    const unreg2 = registerSolid("test-replace", 10, 10, 2);
    try {
      // The solid should be at (10, 10), not (0, 0)
      const [x, z] = resolveCollision(0, 0);
      expect(x).toBe(0);
      expect(z).toBe(0);

      const [x2] = resolveCollision(11, 10);
      expect(x2).toBeGreaterThan(11);
    } finally {
      unreg1();
      unreg2();
    }
  });

  it("unregister removes the solid", () => {
    const unreg = registerSolid("test-unreg", 0, 0, 2);
    unreg();
    const [x, z] = resolveCollision(0, 0);
    expect(x).toBe(0);
    expect(z).toBe(0);
  });
});
