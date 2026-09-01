import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getToonGradient } from "../lib/toon";
import { getWattleMarkTexture } from "../lib/textures";
import { terrainHeight } from "../lib/terrain";
import { COLORS, SPAWN_POSITION, PAD_RADIUS, PAD_HEIGHT } from "../constants";

export function SpawnPad() {
  const gradientMap = useMemo(() => getToonGradient(), []);
  const wattleTex = useMemo(() => getWattleMarkTexture(), []);
  const ringRef = useRef<THREE.Mesh>(null);

  const terrainH = useMemo(() => terrainHeight(SPAWN_POSITION.x, SPAWN_POSITION.z), []);
  const padTopY = terrainH + PAD_HEIGHT;
  const PAD_SINK = 0.15;

  const metalColor = useMemo(() => new THREE.Color("#2a3f5f"), []);
  const rimColor = useMemo(() => new THREE.Color("#3d5a80"), []);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.elapsedTime;
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(t * 1.5) * 0.15;
    }
  });

  return (
    <group position={[SPAWN_POSITION.x, 0, SPAWN_POSITION.z]}>
      {/* Pad body, sunk slightly so bottom face doesn't z-fight terrain */}
      <mesh position={[0, padTopY - PAD_HEIGHT / 2 - PAD_SINK, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[PAD_RADIUS, PAD_RADIUS + 0.3, PAD_HEIGHT, 16]} />
        <meshToonMaterial color={metalColor} gradientMap={gradientMap} />
      </mesh>

      {/* Raised rim */}
      <mesh position={[0, padTopY - PAD_SINK, 0]} castShadow>
        <cylinderGeometry args={[PAD_RADIUS, PAD_RADIUS, 0.12, 16, 1, true]} />
        <meshToonMaterial color={rimColor} gradientMap={gradientMap} side={THREE.DoubleSide} />
      </mesh>

      {/* Wattle logo on top */}
      <mesh position={[0, padTopY + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[5, 5]} />
        <meshBasicMaterial map={wattleTex} transparent opacity={0.9} depthWrite={false} />
      </mesh>

      {/* Glowing ring around edge */}
      <mesh ref={ringRef} position={[0, padTopY + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <ringGeometry args={[PAD_RADIUS - 0.2, PAD_RADIUS - 0.05, 32]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <pointLight position={[0, padTopY + 2, 0]} intensity={1} color={COLORS.cyan} distance={12} />
    </group>
  );
}
