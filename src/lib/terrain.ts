import { createNoise2D } from "simplex-noise";
import { SPAWN_POSITION, PAD_RADIUS, WATER_LEVEL, POND_DEPRESSIONS } from "../constants";

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noise2D = createNoise2D(mulberry32(42));

function rawTerrainHeight(x: number, z: number): number {
  const s = 0.012;
  let h = 0;
  h += noise2D(x * s, z * s) * 14;
  h += noise2D(x * s * 2.3, z * s * 2.3) * 6;
  h += noise2D(x * s * 5.1, z * s * 5.1) * 2.5;
  h += noise2D(x * s * 12.0, z * s * 12.0) * 0.8;

  // Central basin around the core
  const distFromCenter = Math.sqrt(x * x + z * z);
  const basinRadius = 22;
  if (distFromCenter < basinRadius) {
    const t = distFromCenter / basinRadius;
    const basin = (1 - t) * (1 - t) * 4;
    h -= basin;
  }

  // Underwater depression zones (ponds)
  for (const { x: cx, z: cz, radius, depth } of POND_DEPRESSIONS) {
    const d = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2);
    h -= depth * Math.exp(-(d * d) / (radius * radius));
  }

  // Mountain walls at the perimeter
  const edge = Math.max(Math.abs(x), Math.abs(z));
  const wallStart = 60;
  if (edge > wallStart) {
    const t = Math.min((edge - wallStart) / 18, 1);
    h += t * t * 40;
  }

  return h;
}

const SPAWN_BASE_H = Math.max(rawTerrainHeight(SPAWN_POSITION.x, SPAWN_POSITION.z), WATER_LEVEL + 1.5);
const FLAT_RADIUS = PAD_RADIUS + 2;
const BLEND_RADIUS = FLAT_RADIUS + 4;

export function terrainHeight(x: number, z: number): number {
  const h = rawTerrainHeight(x, z);

  const dx = x - SPAWN_POSITION.x;
  const dz = z - SPAWN_POSITION.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < BLEND_RADIUS) {
    const t = dist < FLAT_RADIUS ? 0 : (dist - FLAT_RADIUS) / (BLEND_RADIUS - FLAT_RADIUS);
    const smooth = t * t * (3 - 2 * t);
    return h * smooth + SPAWN_BASE_H * (1 - smooth);
  }

  return h;
}
