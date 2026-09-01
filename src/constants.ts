import type { ShardId } from "./store";

export const SHARD_COLORS: Record<ShardId, string> = {
  signal: "#22d3ee",
  resonance: "#ffa726",
  memory: "#e879f9",
};

export const WORLD_SIZE = 160;
export const WORLD_HALF = WORLD_SIZE / 2;
export const TERRAIN_SEGMENTS = 400;
export const EYE_HEIGHT = 1.7;
export const WALK_SPEED = 8;
export const SPRINT_SPEED = 14;
export const JUMP_SPEED = 6;
export const GRAVITY = 18;
export const INTERACT_RANGE = 6;
export const WATER_LEVEL = -0.5;
export const SWIM_SPEED = 3.5;
export const WATER_GRAVITY = 4;

export const CAMERA_DISTANCE = 5;
export const CAMERA_HEIGHT = 2.5;
export const CAMERA_MIN_DISTANCE = 1.5;
export const AVATAR_HEIGHT = 1.7;
export const MOUSE_SENSITIVITY = 0.0022;

export const PUZZLE_POSITIONS = {
  signal: [-42, 0, -38],
  resonance: [44, 0, -30],
  memory: [8, 0, 48],
} as const;

export const CORE_POSITION = [0, 0, 0] as const;

export const SPAWN_POSITION = { x: 0, z: 55 };
export const PAD_RADIUS = 4;
export const PAD_HEIGHT = 1.0;

export interface PondDepression {
  x: number;
  z: number;
  radius: number;
  depth: number;
}

export const POND_DEPRESSIONS: PondDepression[] = [
  { x: 25, z: 15, radius: 8, depth: 3 },
  { x: -20, z: -25, radius: 8, depth: 3 },
];

export const COLORS = {
  sky: "#5dade2",
  skyTop: "#4a90d9",
  skyHorizon: "#fad7a0",
  fog: "#aed6f1",
  grass: "#6ab04c",
  grassDark: "#4a8a36",
  rock: "#c9a96e",
  snow: "#f0f0f0",
  water: "#48d1cc",
  mountain: "#8b7d9b",
  mountainCap: "#ffffff",
  stone: "#d2b48c",
  amber: "#ffa726",
  cyan: "#22d3ee",
  cyanGlow: "#06b6d4",
  magenta: "#e879f9",
  shardRestored: "#34d399",
  shardDormant: "#fbbf24",
} as const;
