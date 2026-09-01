import { describe, it, expect, beforeEach } from "vitest";
import { footprints, addFootprint, clearFootprints, getFootprintVersion } from "./footprints";

beforeEach(() => {
  clearFootprints();
});

describe("addFootprint", () => {
  it("adds a footprint to the array", () => {
    addFootprint(1, 2, 3, 0.5, 0);
    expect(footprints).toHaveLength(1);
    expect(footprints[0].x).toBe(1);
    expect(footprints[0].z).toBe(2);
    expect(footprints[0].y).toBe(3);
    expect(footprints[0].heading).toBe(0.5);
    expect(footprints[0].side).toBe(0);
  });

  it("increments the version counter", () => {
    const v0 = getFootprintVersion();
    addFootprint(0, 0, 0, 0, 0);
    expect(getFootprintVersion()).toBe(v0 + 1);
    addFootprint(0, 0, 0, 0, 0);
    expect(getFootprintVersion()).toBe(v0 + 2);
  });

  it("caps footprint count at 60", () => {
    for (let i = 0; i < 70; i++) {
      addFootprint(i, 0, 0, 0, i % 2);
    }
    expect(footprints).toHaveLength(60);
    // The oldest should have been removed, so the first entry is footprint 10
    expect(footprints[0].x).toBe(10);
  });

  it("alternates side values correctly", () => {
    addFootprint(0, 0, 0, 0, 1);
    addFootprint(0, 0, 0, 0, -1);
    addFootprint(0, 0, 0, 0, 1);
    expect(footprints[0].side).toBe(1);
    expect(footprints[1].side).toBe(-1);
    expect(footprints[2].side).toBe(1);
  });

  it("stores startTime from performance.now", () => {
    const before = performance.now();
    addFootprint(0, 0, 0, 0, 0);
    const after = performance.now();
    const ts = footprints[0].startTime;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe("clearFootprints", () => {
  it("removes all footprints", () => {
    addFootprint(1, 2, 3, 0, 0);
    addFootprint(4, 5, 6, 0, 1);
    expect(footprints).toHaveLength(2);
    clearFootprints();
    expect(footprints).toHaveLength(0);
  });

  it("does not reset the version counter", () => {
    addFootprint(0, 0, 0, 0, 0);
    const v = getFootprintVersion();
    clearFootprints();
    expect(getFootprintVersion()).toBe(v);
  });
});

describe("getFootprintVersion", () => {
  it("returns a monotonically increasing number", () => {
    const v0 = getFootprintVersion();
    addFootprint(0, 0, 0, 0, 0);
    const v1 = getFootprintVersion();
    expect(v1).toBeGreaterThan(v0);
  });
});
