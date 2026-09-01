import type { ShardId } from "../store";
import { PUZZLE_POSITIONS, POND_DEPRESSIONS, WATER_LEVEL } from "../constants";
import { terrainHeight } from "./terrain";

export interface FragmentDef {
  id: number;
  shard?: ShardId;
  position: [number, number, number];
  lore: string;
  bonus?: boolean;
}

const LORE: Record<ShardId, string[]> = {
  signal: [
    "Signal log: the blackout severed every frequency. Light must be bent back to the source.",
    "Fragment: mirrors remember the angle of the last transmission.",
    "Cache: the receiver has been dormant since the silence began.",
  ],
  resonance: [
    "Echo: each fork holds a tone from Matilda's last symphony.",
    "Memory: the pattern was her favourite sequence. She hummed it as the lights went out.",
    "Trace: resonance is the language of memory. Listen, then repeat.",
  ],
  memory: [
    "Record: the glyphs encode her final thoughts before shutdown.",
    "Fragment: each pillar is a synapse. Fire them in order to wake the sequence.",
    "Log: memory is not storage. Memory is rhythm. Recall the pattern.",
  ],
};

export function generateFragments(): FragmentDef[] {
  const fragments: FragmentDef[] = [];
  const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  let id = 0;

  (Object.keys(PUZZLE_POSITIONS) as ShardId[]).forEach((shard) => {
    const px = PUZZLE_POSITIONS[shard];
    angles.forEach((baseAngle, i) => {
      const dist = 14 + (i * 3);
      let angle = baseAngle;
      let x = 0, z = 0, y = 0;
      let attempts = 0;
      do {
        x = px[0] + Math.cos(angle) * dist;
        z = px[2] + Math.sin(angle) * dist;
        y = terrainHeight(x, z) + 1.5;
        if (y >= WATER_LEVEL + 1.5) break;
        angle += Math.PI / 6;
        attempts++;
      } while (attempts < 12);
      fragments.push({
        id: id++,
        shard,
        position: [x, y, z],
        lore: LORE[shard][i],
      });
    });
  });

  // Bonus fragments hidden underwater in depression zones
  const bonusLore = [
    "Hidden cache: data sunk beneath the surface. The valley keeps its secrets deep.",
    "Encrypted log: forgotten packets rest where light cannot reach. Dive to retrieve them.",
  ];
  POND_DEPRESSIONS.forEach((pond, i) => {
    const by = terrainHeight(pond.x, pond.z) - 0.5;
    fragments.push({
      id: id++,
      position: [pond.x, by, pond.z],
      lore: bonusLore[i] ?? "",
      bonus: true,
    });
  });

  return fragments;
}
