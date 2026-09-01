import { describe, it, expect } from "vitest";
import { PUZZLE_LIST, FRAGMENT_POSITIONS, playerTelemetry } from "./playerState";
import { PUZZLE_POSITIONS } from "../constants";
import type { ShardId } from "../store";

describe("PUZZLE_LIST", () => {
  it("has 3 entries", () => {
    expect(PUZZLE_LIST).toHaveLength(3);
  });

  it("contains all three shard ids", () => {
    const ids = PUZZLE_LIST.map((p) => p.id);
    expect(ids).toContain("signal");
    expect(ids).toContain("resonance");
    expect(ids).toContain("memory");
  });

  it("derives x and z from PUZZLE_POSITIONS", () => {
    for (const p of PUZZLE_LIST) {
      const pos = PUZZLE_POSITIONS[p.id as ShardId];
      expect(p.x).toBe(pos[0]);
      expect(p.z).toBe(pos[2]);
    }
  });

  it("has a label for each entry", () => {
    for (const p of PUZZLE_LIST) {
      expect(typeof p.label).toBe("string");
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

describe("FRAGMENT_POSITIONS", () => {
  it("has 11 entries (9 main + 2 bonus)", () => {
    expect(FRAGMENT_POSITIONS).toHaveLength(11);
  });

  it("has 9 main fragments with shard assignments", () => {
    const main = FRAGMENT_POSITIONS.filter((f) => f.shard);
    expect(main).toHaveLength(9);
  });

  it("has 2 bonus fragments without shard", () => {
    const bonus = FRAGMENT_POSITIONS.filter((f) => !f.shard);
    expect(bonus).toHaveLength(2);
  });

  it("has 3 fragments per shard", () => {
    for (const shard of ["signal", "resonance", "memory"] as ShardId[]) {
      const count = FRAGMENT_POSITIONS.filter((f) => f.shard === shard).length;
      expect(count).toBe(3);
    }
  });

  it("each entry has id, x, z", () => {
    for (const f of FRAGMENT_POSITIONS) {
      expect(typeof f.id).toBe("number");
      expect(typeof f.x).toBe("number");
      expect(typeof f.z).toBe("number");
    }
  });

  it("ids are unique and sequential from 0", () => {
    const ids = FRAGMENT_POSITIONS.map((f) => f.id);
    expect(ids).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("playerTelemetry", () => {
  it("has expected initial values", () => {
    expect(playerTelemetry.x).toBe(0);
    expect(playerTelemetry.y).toBe(5);
    expect(playerTelemetry.z).toBe(55);
    expect(playerTelemetry.heading).toBe(0);
    expect(playerTelemetry.velocityY).toBe(0);
    expect(playerTelemetry.isGrounded).toBe(true);
    expect(playerTelemetry.isUnderwater).toBe(false);
    expect(playerTelemetry.isInWater).toBe(false);
  });
});