import { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../store";
import { Audio } from "../lib/Audio";
import { generateFragments, type FragmentDef } from "../lib/fragments";
import { COLORS } from "../constants";
import { playerTelemetry } from "../lib/playerState";
import { getToonGradient } from "../lib/toon";

const COLLECT_RADIUS = 2.5;

function FragmentCluster({
  data,
  collected,
}: {
  data: FragmentDef;
  collected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const orbRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const gradientMap = useMemo(() => getToonGradient(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (groupRef.current && !collected) {
      groupRef.current.rotation.y = t * 0.3;
    }

    if (orbRef.current && !collected) {
      const mat = orbRef.current.material as THREE.MeshToonMaterial;
      const dx = playerTelemetry.x - data.position[0];
      const dz = playerTelemetry.z - data.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      const proximityGlow = THREE.MathUtils.clamp(1 - dist / 12, 0, 1);
      mat.emissiveIntensity = 0.8 + proximityGlow * 2.0 + Math.sin(t * 2 + data.id) * 0.3;
      orbRef.current.position.y = data.position[1] + Math.sin(t * 1.5 + data.id) * 0.3;
      const scale = 1 + proximityGlow * 0.4;
      orbRef.current.scale.setScalar(scale);
    }

    if (beamRef.current && !collected) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(t * 1.2 + data.id) * 0.04;
    }
  });

  const crystalColor = data.shard === "signal" ? COLORS.cyan
    : data.shard === "resonance" ? COLORS.amber
    : COLORS.magenta;

  return (
    <group ref={groupRef} position={data.position}>
      {!collected && (
        <>
          {/* Vertical light beam */}
          <mesh ref={beamRef} position={[0, 8, 0]}>
            <cylinderGeometry args={[0.3, 0.5, 16, 8, 1, true]} />
            <meshBasicMaterial
              color={crystalColor}
              transparent
              opacity={0.12}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Crystal cluster base */}
          <mesh position={[0, -0.8, 0]} castShadow>
            <octahedronGeometry args={[0.6, 0]} />
            <meshToonMaterial
              color={crystalColor}
              gradientMap={gradientMap}
              emissive={crystalColor}
              emissiveIntensity={0.3}
              transparent
              opacity={0.7}
            />
          </mesh>
          <mesh position={[0.5, -0.6, 0.3]} rotation={[0.2, 0, 0.3]} castShadow>
            <octahedronGeometry args={[0.4, 0]} />
            <meshToonMaterial
              color={crystalColor}
              gradientMap={gradientMap}
              emissive={crystalColor}
              emissiveIntensity={0.2}
              transparent
              opacity={0.6}
            />
          </mesh>
          <mesh position={[-0.4, -0.5, -0.2]} rotation={[-0.2, 0.5, 0]} castShadow>
            <octahedronGeometry args={[0.35, 0]} />
            <meshToonMaterial
              color={crystalColor}
              gradientMap={gradientMap}
              emissive={crystalColor}
              emissiveIntensity={0.2}
              transparent
              opacity={0.6}
            />
          </mesh>

          {/* Floating fragment orb */}
          <mesh ref={orbRef} position={[0, 0, 0]} castShadow>
            <octahedronGeometry args={[0.5, 0]} />
            <meshToonMaterial
              color={crystalColor}
              gradientMap={gradientMap}
              emissive={crystalColor}
              emissiveIntensity={0.8}
              transparent
              opacity={0.85}
            />
          </mesh>
        </>
      )}

      {/* Dark stump when collected */}
      {collected && (
        <mesh position={[0, -0.8, 0]}>
          <octahedronGeometry args={[0.4, 0]} />
          <meshToonMaterial color="#6b5d7b" gradientMap={gradientMap} />
        </mesh>
      )}
    </group>
  );
}

export function DataFragments() {
  const phase = useGame((s) => s.phase);
  const collectFragmentForShard = useGame((s) => s.collectFragmentForShard);
  const collectBonusFragment = useGame((s) => s.collectBonusFragment);
  const savedCollectedIds = useGame((s) => s.collectedFragmentIds);
  const collectedRef = useRef<Set<number>>(new Set(savedCollectedIds));
  const [collectedIds, setCollectedIds] = useState<number[]>(savedCollectedIds);

  const fragments = useMemo(() => generateFragments(), []);

  useFrame(() => {
    if (phase !== "playing") return;
    for (const f of fragments) {
      if (collectedRef.current.has(f.id)) continue;
      const dx = playerTelemetry.x - f.position[0];
      const dz = playerTelemetry.z - f.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < COLLECT_RADIUS) {
        collectedRef.current.add(f.id);
        setCollectedIds((prev) => [...prev, f.id]);
        if (f.bonus) {
          collectBonusFragment(f.id, f.lore);
          Audio.shardRestored();
        } else if (f.shard) {
          collectFragmentForShard(f.shard, f.id, f.lore);
          Audio.correct();
        }
      }
    }
  });

  if (phase !== "playing") return null;

  return (
    <>
      {fragments.map((f) => (
        <FragmentCluster
          key={f.id}
          data={f}
          collected={collectedIds.includes(f.id)}
        />
      ))}
    </>
  );
}

export { TOTAL_FRAGMENTS } from "../store";