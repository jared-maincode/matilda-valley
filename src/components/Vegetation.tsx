import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instances, Instance } from "@react-three/drei";
import { terrainHeight } from "../lib/terrain";
import { registerSolid } from "../lib/collision";
import { COLORS, WORLD_SIZE, PUZZLE_POSITIONS, SHARD_COLORS } from "../constants";
import { getToonGradient } from "../lib/toon";
import type { ShardId } from "../store";

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function GrassTufts() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const gradientMap = useMemo(() => getToonGradient(), []);
  const count = 2500;

  const baseData = useMemo(() => {
    const rand = seededRandom(42);
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const yRotations = new Float32Array(count);
    const phases = new Float32Array(count);
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 4) {
      attempts++;
      const x = (rand() - 0.5) * WORLD_SIZE * 0.8;
      const z = (rand() - 0.5) * WORLD_SIZE * 0.8;
      const h = terrainHeight(x, z);
      if (h < 0.5 || h > 6) continue;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 8) continue;
      const scale = 0.5 + rand() * 0.5;
      const rot = rand() * Math.PI * 2;
      const phase = rand() * Math.PI * 2;
      positions[placed * 3] = x;
      positions[placed * 3 + 1] = h;
      positions[placed * 3 + 2] = z;
      scales[placed] = scale;
      yRotations[placed] = rot;
      phases[placed] = phase;
      placed++;
    }
    return { positions, scales, yRotations, phases, actualCount: placed };
  }, []);

  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempQuat = useMemo(() => new THREE.Quaternion(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);
  const tempEuler = useMemo(() => new THREE.Euler(), []);
  const tempMat = useMemo(() => new THREE.Matrix4(), []);

  const applyMatrices = (swayTime: number) => {
    if (!meshRef.current) return;
    const { positions, scales, yRotations, phases, actualCount } = baseData;
    for (let i = 0; i < actualCount; i++) {
      const sway = Math.sin(swayTime * 1.5 + phases[i]) * 0.08;
      tempPos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      tempEuler.set(0, yRotations[i], sway);
      tempQuat.setFromEuler(tempEuler);
      tempScale.setScalar(scales[i]);
      tempMat.compose(tempPos, tempQuat, tempScale);
      meshRef.current.setMatrixAt(i, tempMat);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => {
    if (!meshRef.current) return;
    const { positions, scales, yRotations, actualCount } = baseData;
    for (let i = 0; i < actualCount; i++) {
      tempPos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      tempEuler.set(0, yRotations[i], 0);
      tempQuat.setFromEuler(tempEuler);
      tempScale.setScalar(scales[i]);
      tempMat.compose(tempPos, tempQuat, tempScale);
      meshRef.current.setMatrixAt(i, tempMat);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [baseData, tempPos, tempEuler, tempQuat, tempScale, tempMat]);

  useFrame(({ clock }) => {
    applyMatrices(clock.elapsedTime);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, baseData.actualCount]} castShadow>
      <coneGeometry args={[0.12, 0.5, 4]} />
      <meshToonMaterial color={COLORS.grassDark} gradientMap={gradientMap} />
    </instancedMesh>
  );
}

function ScatterRocks() {
  const gradientMap = useMemo(() => getToonGradient(), []);
  const count = 150;
  const items = useMemo(() => {
    const rand = seededRandom(99);
    const data: { pos: [number, number, number]; rot: [number, number, number]; scale: number }[] = [];
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 4) {
      attempts++;
      const x = (rand() - 0.5) * WORLD_SIZE * 0.8;
      const z = (rand() - 0.5) * WORLD_SIZE * 0.8;
      const h = terrainHeight(x, z);
      if (h < 1 || h > 14) continue;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 8) continue;
      const scale = 0.4 + rand() * 1.0;
      data.push({ pos: [x, h, z], rot: [rand() * 0.3, rand() * Math.PI * 2, rand() * 0.3], scale });
      placed++;
    }
    return data;
  }, []);

  return (
    <Instances limit={count} range={count}>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshToonMaterial color={COLORS.rock} gradientMap={gradientMap} />
      {items.map((item, i) => (
        <Instance key={i} position={item.pos} rotation={item.rot} scale={item.scale} />
      ))}
    </Instances>
  );
}

const TREE_CANOPY_COLORS = ["#4a9a3a", "#5aaa4a", "#3a8a30", "#6ab04c"];

function CartoonTrees() {
  const gradientMap = useMemo(() => getToonGradient(), []);
  const items = useMemo(() => {
    const rand = seededRandom(55);
    type TreeDef = {
      pos: [number, number, number];
      trunkScale: number;
      canopyScale: number;
      canopyColor: string;
      canopyOffset: [number, number, number][];
    };
    const data: TreeDef[] = [];
    let placed = 0;
    let attempts = 0;
    while (placed < 60 && attempts < 400) {
      attempts++;
      const x = (rand() - 0.5) * WORLD_SIZE * 0.7;
      const z = (rand() - 0.5) * WORLD_SIZE * 0.7;
      const h = terrainHeight(x, z);
      if (h < 1 || h > 10) continue;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 12) continue;
      const trunkScale = 1.0 + rand() * 0.8;
      const canopyScale = 1.2 + rand() * 0.8;
      const colorIdx = Math.floor(rand() * TREE_CANOPY_COLORS.length);
      const numCanopies = 1 + Math.floor(rand() * 3);
      const canopies: [number, number, number][] = [];
      for (let c = 0; c < numCanopies; c++) {
        canopies.push([
          (rand() - 0.5) * 0.8,
          c * 0.6,
          (rand() - 0.5) * 0.8,
        ]);
      }
      data.push({
        pos: [x, h, z],
        trunkScale,
        canopyScale,
        canopyColor: TREE_CANOPY_COLORS[colorIdx],
        canopyOffset: canopies,
      });
      placed++;
    }
    return data;
  }, []);

  useEffect(() => {
    const unregs = items.map((tree, i) =>
      registerSolid(`tree-${i}`, tree.pos[0], tree.pos[2], 0.4),
    );
    return () => unregs.forEach((u) => u());
  }, [items]);

  return (
    <>
      {items.map((tree, i) => (
        <group key={i} position={tree.pos}>
          <mesh position={[0, 1.2 * tree.trunkScale, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 2.4 * tree.trunkScale, 6]} />
            <meshToonMaterial color="#8b6f47" gradientMap={gradientMap} />
          </mesh>
          {tree.canopyOffset.map((offset, ci) => (
            <mesh
              key={ci}
              position={[offset[0], (2.4 + offset[1]) * tree.trunkScale, offset[2]]}
              scale={tree.canopyScale * (1 - ci * 0.15)}
              castShadow
            >
              <icosahedronGeometry args={[0.9, 1]} />
              <meshToonMaterial color={tree.canopyColor} gradientMap={gradientMap} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function CrystalClusters() {
  const gradientMap = useMemo(() => getToonGradient(), []);
  const items = useMemo(() => {
    const rand = seededRandom(17);
    const data: { pos: [number, number, number]; color: string; scale: number }[] = [];
    const shards: ShardId[] = ["signal", "resonance", "memory"];
    for (let i = 0; i < 40; i++) {
      const shard = shards[i % 3];
      const puzzle = PUZZLE_POSITIONS[shard];
      const angle = rand() * Math.PI * 2;
      const dist = 15 + rand() * 40;
      const x = puzzle[0] + Math.cos(angle) * dist;
      const z = puzzle[2] + Math.sin(angle) * dist;
      const edge = Math.max(Math.abs(x), Math.abs(z));
      if (edge > WORLD_SIZE / 2 - 5) continue;
      const h = terrainHeight(x, z);
      if (h < 0) continue;
      const scale = 0.5 + rand() * 0.5;
      data.push({ pos: [x, h, z], color: SHARD_COLORS[shard], scale });
    }
    return data;
  }, []);

  return (
    <>
      {items.map((item, i) => (
        <group key={i} position={item.pos}>
          <mesh position={[0, 0.4 * item.scale, 0]} castShadow>
            <octahedronGeometry args={[0.35 * item.scale, 0]} />
            <meshToonMaterial
              color={item.color}
              gradientMap={gradientMap}
              transparent
              opacity={0.85}
              emissive={item.color}
              emissiveIntensity={0.6}
            />
          </mesh>
          <mesh position={[0.25 * item.scale, 0.25 * item.scale, 0.15 * item.scale]} rotation={[0.3, 0, 0.2]} castShadow>
            <octahedronGeometry args={[0.22 * item.scale, 0]} />
            <meshToonMaterial
              color={item.color}
              gradientMap={gradientMap}
              transparent
              opacity={0.75}
              emissive={item.color}
              emissiveIntensity={0.6}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function RuinFragments() {
  const gradientMap = useMemo(() => getToonGradient(), []);
  const items = useMemo(() => {
    const rand = seededRandom(77);
    type RuinDef = {
      pos: [number, number, number];
      rot: [number, number, number];
      scale: [number, number, number];
      type: "pillar" | "block";
    };
    const data: RuinDef[] = [];
    let placed = 0;
    let attempts = 0;
    while (placed < 15 && attempts < 100) {
      attempts++;
      const x = (rand() - 0.5) * WORLD_SIZE * 0.6;
      const z = (rand() - 0.5) * WORLD_SIZE * 0.6;
      const h = terrainHeight(x, z);
      if (h < 0.5 || h > 8) continue;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 12) continue;
      const isPillar = rand() > 0.5;
      if (isPillar) {
        data.push({
          pos: [x, h, z],
          rot: [rand() * 0.15, rand() * Math.PI * 2, rand() * 0.15],
          scale: [0.5 + rand() * 0.3, 1.5 + rand() * 2, 0.5 + rand() * 0.3],
          type: "pillar" as const,
        });
      } else {
        data.push({
          pos: [x, h, z],
          rot: [rand() * 0.3, rand() * Math.PI * 2, rand() * 0.3],
          scale: [0.8 + rand() * 0.6, 0.4 + rand() * 0.4, 0.6 + rand() * 0.5],
          type: "block" as const,
        });
      }
      placed++;
    }
    return data;
  }, []);

  useEffect(() => {
    const unregs = items.map((item, i) =>
      registerSolid(`ruin-${i}`, item.pos[0], item.pos[2], 0.5),
    );
    return () => unregs.forEach((u) => u());
  }, [items]);

  return (
    <>
      {items.map((item, i) => (
        <mesh key={i} position={item.pos} rotation={item.rot} scale={item.scale} castShadow>
          {item.type === "pillar" ? (
            <cylinderGeometry args={[0.4, 0.5, 1, 8, 1, false]} />
          ) : (
            <boxGeometry args={[1, 1, 1]} />
          )}
          <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
        </mesh>
      ))}
    </>
  );
}

export function Vegetation() {
  return (
    <>
      <GrassTufts />
      <ScatterRocks />
      <CartoonTrees />
      <CrystalClusters />
      <RuinFragments />
    </>
  );
}
