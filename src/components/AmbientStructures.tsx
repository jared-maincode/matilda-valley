import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { terrainHeight } from "../lib/terrain";
import { registerSolid } from "../lib/collision";
import { COLORS, CORE_POSITION, PUZZLE_POSITIONS, SHARD_COLORS } from "../constants";
import { getToonGradient } from "../lib/toon";
import type { ShardId } from "../store";

interface LandmarkDef {
  id: string;
  x: number;
  z: number;
  rotation: number;
  scale: number;
  type: "archway" | "monolith" | "crystalSpire";
  color: string;
}

function buildLandmarks(): LandmarkDef[] {
  const defs: LandmarkDef[] = [];
  const core: [number, number] = [CORE_POSITION[0], CORE_POSITION[2]];

  (Object.keys(PUZZLE_POSITIONS) as ShardId[]).forEach((shard) => {
    const p = PUZZLE_POSITIONS[shard];
    const px: [number, number] = [p[0], p[2]];
    const mx = (core[0] + px[0]) / 2;
    const mz = (core[1] + px[1]) / 2;
    const angle = Math.atan2(px[1] - core[1], px[0] - core[0]);

    defs.push({
      id: `arch-${shard}`,
      x: mx,
      z: mz,
      rotation: angle + Math.PI / 2,
      scale: 1,
      type: "archway",
      color: SHARD_COLORS[shard],
    });

    const perpX = -Math.sin(angle);
    const perpZ = Math.cos(angle);
    const offDist = 12;
    defs.push({
      id: `spire-${shard}-a`,
      x: mx + perpX * offDist,
      z: mz + perpZ * offDist,
      rotation: 0,
      scale: 0.8 + Math.random() * 0.3,
      type: "crystalSpire",
      color: SHARD_COLORS[shard],
    });
    defs.push({
      id: `spire-${shard}-b`,
      x: mx - perpX * offDist,
      z: mz - perpZ * offDist,
      rotation: 0,
      scale: 0.7 + Math.random() * 0.3,
      type: "crystalSpire",
      color: SHARD_COLORS[shard],
    });
  });

  defs.push({
    id: "monolith-1",
    x: -25,
    z: 20,
    rotation: 0.3,
    scale: 1.2,
    type: "monolith",
    color: COLORS.cyan,
  });
  defs.push({
    id: "monolith-2",
    x: 30,
    z: 25,
    rotation: -0.4,
    scale: 1,
    type: "monolith",
    color: COLORS.amber,
  });

  return defs;
}

function Archway({ def }: { def: LandmarkDef }) {
  const y = terrainHeight(def.x, def.z);
  const ref = useRef<THREE.Group>(null);
  const gradientMap = useMemo(() => getToonGradient(), []);

  useEffect(() => {
    const cos = Math.cos(def.rotation);
    const sin = Math.sin(def.rotation);
    const r = 0.5;
    const unregL = registerSolid(`${def.id}-l`, def.x - 2.5 * cos, def.z + 2.5 * sin, r);
    const unregR = registerSolid(`${def.id}-r`, def.x + 2.5 * cos, def.z - 2.5 * sin, r);
    return () => { unregL(); unregR(); };
  }, [def.id, def.x, def.z, def.rotation]);

  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = (ref.current.children[2] as THREE.Mesh)?.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.2 + Math.sin(clock.elapsedTime * 0.8) * 0.08;
      }
    }
  });

  return (
    <group ref={ref} position={[def.x, y, def.z]} rotation={[0, def.rotation, 0]} scale={def.scale}>
      <mesh position={[-2.5, 3, 0]} castShadow>
        <boxGeometry args={[0.8, 6, 0.8]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[2.5, 3, 0]} castShadow>
        <boxGeometry args={[0.8, 6, 0.8]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 6.2, 0]} castShadow>
        <boxGeometry args={[6, 0.8, 0.8]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 3, 0.42]}>
        <planeGeometry args={[5, 5]} />
        <meshBasicMaterial
          color={def.color}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <pointLight position={[0, 4, 0]} intensity={0.4} color={def.color} distance={10} />
    </group>
  );
}

function CrystalSpire({ def }: { def: LandmarkDef }) {
  const y = terrainHeight(def.x, def.z);
  const ref = useRef<THREE.Mesh>(null);
  const gradientMap = useMemo(() => getToonGradient(), []);

  useEffect(() => {
    return registerSolid(def.id, def.x, def.z, 1.5);
  }, [def.id, def.x, def.z]);

  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshToonMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 0.6 + def.x) * 0.12;
    }
  });

  const height = 5 * def.scale;

  return (
    <mesh ref={ref} position={[def.x, y + height / 2, def.z]} castShadow>
      <coneGeometry args={[0.8 * def.scale, height, 6]} />
      <meshToonMaterial
        color={def.color}
        gradientMap={gradientMap}
        emissive={def.color}
        emissiveIntensity={0.3}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function Monolith({ def }: { def: LandmarkDef }) {
  const y = terrainHeight(def.x, def.z);
  const ref = useRef<THREE.Mesh>(null);
  const gradientMap = useMemo(() => getToonGradient(), []);

  useEffect(() => {
    return registerSolid(def.id, def.x, def.z, 2);
  }, [def.id, def.x, def.z]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.05;
    }
  });

  return (
    <mesh ref={ref} position={[def.x, y + 3, def.z]} rotation={[0, def.rotation, 0]} castShadow>
      <boxGeometry args={[1.5, 6, 1.5]} />
      <meshToonMaterial
        color="#6b5d7b"
        gradientMap={gradientMap}
        emissive={def.color}
        emissiveIntensity={0.08}
      />
    </mesh>
  );
}

export function AmbientStructures() {
  const landmarks = useMemo(() => buildLandmarks(), []);

  return (
    <>
      {landmarks.map((def) => {
        if (def.type === "archway") return <Archway key={def.id} def={def} />;
        if (def.type === "crystalSpire") return <CrystalSpire key={def.id} def={def} />;
        return <Monolith key={def.id} def={def} />;
      })}
    </>
  );
}