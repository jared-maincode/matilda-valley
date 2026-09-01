import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGame, FRAGMENTS_PER_SHARD, type ShardId } from "../store";
import { CORE_POSITION, PUZZLE_POSITIONS, SHARD_COLORS } from "../constants";
import { terrainHeight } from "../lib/terrain";

const BEACON_COUNT = 5;

function BeaconLine({
  from,
  to,
  active,
  color,
}: {
  from: [number, number];
  to: [number, number];
  active: boolean;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseTime = useRef(0);

  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= BEACON_COUNT; i++) {
      const t = i / BEACON_COUNT;
      const x = from[0] + (to[0] - from[0]) * t;
      const z = from[1] + (to[1] - from[1]) * t;
      const y = terrainHeight(x, z) + 0.15;
      pts.push([x, y, z]);
    }
    return pts;
  }, [from, to]);

  useFrame((_, delta) => {
    pulseTime.current += delta;
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) {
          const phase = (pulseTime.current * 1.5 - i * 0.3) % 3;
          const intensity = phase < 1 ? phase : phase < 2 ? 2 - phase : 0;
          mat.opacity = active ? 0.3 + intensity * 0.5 : 0.05;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function PathBeacons() {
  const shards = useGame((s) => s.shards);
  const fragmentsByShard = useGame((s) => s.fragmentsByShard);
  const phase = useGame((s) => s.phase);

  if (phase !== "playing") return null;

  const corePos: [number, number] = [CORE_POSITION[0], CORE_POSITION[2]];

  return (
    <>
      {(Object.keys(PUZZLE_POSITIONS) as ShardId[]).map((key) => {
        const p = PUZZLE_POSITIONS[key];
        const puzzlePos: [number, number] = [p[0], p[2]];
        const locked = !shards[key] && fragmentsByShard[key] < FRAGMENTS_PER_SHARD;
        const beaconColor = locked ? "#ef4444" : SHARD_COLORS[key];
        return (
          <BeaconLine
            key={key}
            from={corePos}
            to={puzzlePos}
            active={!shards[key]}
            color={beaconColor}
          />
        );
      })}
    </>
  );
}
