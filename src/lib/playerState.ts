import type { ShardId } from "../store";
import { PUZZLE_POSITIONS } from "../constants";
import { generateFragments } from "./fragments";

interface PlayerTelemetry {
  x: number;
  y: number;
  z: number;
  heading: number;
  velocityY: number;
  isGrounded: boolean;
  isUnderwater: boolean;
  isInWater: boolean;
}

export const playerTelemetry: PlayerTelemetry = {
  x: 0,
  y: 5,
  z: 55,
  heading: 0,
  velocityY: 0,
  isGrounded: true,
  isUnderwater: false,
  isInWater: false,
};

export const PUZZLE_LIST: { id: ShardId; x: number; z: number; label: string }[] = [
  { id: "signal", x: PUZZLE_POSITIONS.signal[0], z: PUZZLE_POSITIONS.signal[2], label: "Signal" },
  { id: "resonance", x: PUZZLE_POSITIONS.resonance[0], z: PUZZLE_POSITIONS.resonance[2], label: "Resonance" },
  { id: "memory", x: PUZZLE_POSITIONS.memory[0], z: PUZZLE_POSITIONS.memory[2], label: "Memory" },
];

export const FRAGMENT_POSITIONS = generateFragments().map((f) => ({
  id: f.id,
  shard: f.shard,
  x: f.position[0],
  z: f.position[2],
}));
