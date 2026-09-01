interface Solid {
  id: string;
  x: number;
  z: number;
  radius: number;
  type?: "cylinder" | "cone";
  baseY?: number;
  height?: number;
}

const solids: Solid[] = [];

export function registerSolid(
  id: string,
  x: number,
  z: number,
  radius: number,
  type?: "cylinder" | "cone",
  baseY?: number,
  height?: number,
) {
  const existing = solids.findIndex((s) => s.id === id);
  const solid: Solid = { id, x, z, radius, type, baseY, height };
  if (existing >= 0) {
    solids[existing] = solid;
  } else {
    solids.push(solid);
  }
  return () => {
    const idx = solids.findIndex((s) => s.id === id);
    if (idx >= 0) solids.splice(idx, 1);
  };
}

export function resolveCollision(
  x: number,
  z: number,
  y?: number,
  padding: number = 0.8,
): [number, number] {
  let px = x;
  let pz = z;
  for (const s of solids) {
    let effectiveRadius = s.radius;

    if (s.type === "cone" && s.baseY !== undefined && s.height !== undefined && y !== undefined) {
      const heightAboveBase = y - s.baseY;
      if (heightAboveBase >= s.height) continue;
      if (heightAboveBase > 0) {
        effectiveRadius = s.radius * (1 - heightAboveBase / s.height);
      }
    }

    const dx = px - s.x;
    const dz = pz - s.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = effectiveRadius + padding;
    if (dist < minDist && dist > 0.001) {
      const push = (minDist - dist) / dist;
      px += dx * push;
      pz += dz * push;
    }
  }
  return [px, pz];
}
