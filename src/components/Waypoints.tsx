import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { useGame, FRAGMENTS_PER_SHARD, type ShardId } from "../store";
import { terrainHeight } from "../lib/terrain";
import { PUZZLE_POSITIONS, SHARD_COLORS } from "../constants";

const LABELS: Record<ShardId, string> = {
  signal: "SIGNAL ALIGN",
  resonance: "RESONANCE BLOOM",
  memory: "MEMORY MATRIX",
};

function Beacon({ id }: { id: ShardId }) {
  const restored = useGame((s) => s.shards[id]);
  const fragmentCount = useGame((s) => s.fragmentsByShard[id]);
  const beamRef = useRef<THREE.Mesh>(null);
  const iconRef = useRef<THREE.Group>(null);
  const px = PUZZLE_POSITIONS[id];
  const baseY = terrainHeight(px[0], px[2]);

  const locked = !restored && fragmentCount < FRAGMENTS_PER_SHARD;
  const beaconColor = locked ? "#ef4444" : SHARD_COLORS[id];
  const color = useMemo(() => new THREE.Color(beaconColor), [beaconColor]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (iconRef.current) {
      iconRef.current.position.y = baseY + 22 + Math.sin(t * 1.5 + id.length) * 1.5;
      iconRef.current.rotation.y = t * 0.5;
    }
    if (beamRef.current) {
      const m = beamRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.12 + Math.sin(t * 2) * 0.04;
    }
  });

  if (restored) return null;

  const label = locked
    ? `${LABELS[id]} [${fragmentCount}/${FRAGMENTS_PER_SHARD}]`
    : `${LABELS[id]} - UNLOCKED`;

  return (
    <group position={[px[0], 0, px[2]]}>
      <mesh ref={beamRef} position={[0, baseY + 12, 0]}>
        <cylinderGeometry args={[0.3, 0.8, 24, 8, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <pointLight position={[0, baseY + 22, 0]} intensity={1} color={color} distance={30} />

      <group ref={iconRef} position={[0, baseY + 22, 0]}>
        <mesh>
          <octahedronGeometry args={[1.2, 0]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} fog={false} />
        </mesh>
      </group>

      <Billboard position={[0, baseY + 26, 0]}>
        <Text
          fontSize={0.8}
          color={beaconColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

export function Waypoints() {
  const phase = useGame((s) => s.phase);
  if (phase !== "playing") return null;

  return (
    <group>
      <Beacon id="signal" />
      <Beacon id="resonance" />
      <Beacon id="memory" />
    </group>
  );
}
