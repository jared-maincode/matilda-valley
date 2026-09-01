import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import { useGame, FRAGMENTS_PER_SHARD } from "../store";
import { Audio } from "../lib/Audio";
import { registerInteractable } from "../lib/interaction";
import { terrainHeight } from "../lib/terrain";
import { COLORS, PUZZLE_POSITIONS } from "../constants";
import { getToonGradient } from "../lib/toon";
import { LockDome, RestoredVisuals } from "../components/PuzzleShared";
import {
  FORK_COUNT,
  PITCH_COUNT,
  PITCH_COLORS,
  PITCH_LABELS,
  generateTarget,
  generateInitial,
  cyclePitch,
  matchedCount,
  allMatched,
} from "./resonanceBloomLogic";

const PX = PUZZLE_POSITIONS.resonance;
const RING_RADIUS = 3;

const _identityScale = new THREE.Vector3(1, 1, 1);

function forkPositions(count: number): [number, number, number][] {
  const pos: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = PX[0] + Math.cos(a) * RING_RADIUS;
    const z = PX[2] + Math.sin(a) * RING_RADIUS;
    pos.push([x, terrainHeight(x, z), z]);
  }
  return pos;
}

function TuningFork({
  position, index, pitch, matched, onInteract, locked, restored,
}: {
  position: [number, number, number];
  index: number;
  pitch: number;
  matched: boolean;
  onInteract: (i: number) => void;
  locked: boolean;
  restored: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const gemRef = useRef<THREE.Mesh>(null);
  const yBase = position[1] + 1.5;
  const gradientMap = useMemo(() => getToonGradient(), []);
  const pitchColor = PITCH_COLORS[pitch];

  useEffect(() => {
    const obj = ref.current;
    if (!obj) return;
    return registerInteractable({
      id: `resonance:fork-${index}`,
      object: obj,
      prompt: locked
        ? `Locked: collect ${FRAGMENTS_PER_SHARD} resonance fragments`
        : restored
          ? ""
          : `[E] Cycle fork ${index + 1}  (${PITCH_LABELS[pitch]})`,
    });
  }, [index, locked, restored, pitch]);

  useEffect(() => {
    if (locked || restored) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string };
      if (detail.id === `resonance:fork-${index}`) {
        onInteract(index);
      }
    };
    window.addEventListener("interact", handler);
    return () => window.removeEventListener("interact", handler);
  }, [index, onInteract, locked, restored]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (matched) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.04);
    } else {
      meshRef.current.scale.lerp(_identityScale, 0.15);
    }
    if (gemRef.current) {
      const mat = gemRef.current.material as THREE.MeshToonMaterial;
      mat.emissiveIntensity = matched
        ? 0.8 + Math.sin(clock.elapsedTime * 4) * 0.15
        : 0.4;
    }
  });

  return (
    <group ref={ref} position={[position[0], yBase, position[2]]}>
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 2, 8]} />
        <meshToonMaterial color={pitchColor} gradientMap={gradientMap} emissive={pitchColor} emissiveIntensity={matched ? 0.8 : 0.4} />
      </mesh>
      <mesh ref={gemRef} position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshToonMaterial color={pitchColor} gradientMap={gradientMap} emissive={pitchColor} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.3, 8]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      {matched && <pointLight position={[0, 0.5, 0]} intensity={1} color={COLORS.shardRestored} distance={4} />}
    </group>
  );
}

function TargetIndicator({
  target,
  forkAngles,
}: {
  target: number[];
  forkAngles: number[];
}) {
  const baseY = terrainHeight(PX[0], PX[2]);
  const gradientMap = useMemo(() => getToonGradient(), []);

  return (
    <group position={[PX[0], baseY, PX[2]]}>
      {target.map((pitch, i) => {
        const a = forkAngles[i];
        const r = 0.8;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        return (
          <mesh key={i} position={[x, 1.3, z]} rotation={[Math.PI / 2, 0, -a]}>
            <torusGeometry args={[0.15, 0.04, 8, 16]} />
            <meshToonMaterial
              color={PITCH_COLORS[pitch]}
              gradientMap={gradientMap}
              emissive={PITCH_COLORS[pitch]}
              emissiveIntensity={0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function CentralBeacon({
  restored,
  locked,
  allMatched,
}: {
  restored: boolean;
  locked: boolean;
  allMatched: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const baseY = terrainHeight(PX[0], PX[2]);
  const gradientMap = useMemo(() => getToonGradient(), []);

  useEffect(() => {
    const obj = ref.current;
    if (!obj) return;
    return registerInteractable({
      id: "resonance:beacon",
      object: obj,
      prompt: restored ? "" : locked
        ? `Locked: collect ${FRAGMENTS_PER_SHARD} resonance fragments`
        : "Resonance Core",
    });
  }, [restored, locked]);

  useFrame(({ clock }) => {
    if (!coreRef.current) return;
    const t = clock.elapsedTime;
    coreRef.current.rotation.y = t * 0.3;
    if (allMatched) {
      coreRef.current.scale.setScalar(1 + Math.sin(t * 8) * 0.06);
    } else {
      coreRef.current.scale.lerp(_identityScale, 0.1);
    }
  });

  const beaconColor = restored
    ? COLORS.shardRestored
    : locked
      ? "#ef4444"
      : allMatched
        ? COLORS.shardRestored
        : COLORS.amber;

  return (
    <group ref={ref} position={[PX[0], baseY, PX[2]]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.2, 1.5, 0.3, 16]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      <mesh ref={coreRef} position={[0, 1.2, 0]}>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshToonMaterial
          color={beaconColor}
          gradientMap={gradientMap}
          emissive={beaconColor}
          emissiveIntensity={0.6}
        />
      </mesh>
      <pointLight position={[0, 1.2, 0]} intensity={2} color={beaconColor} distance={8} />
    </group>
  );
}

export function ResonanceBloom() {
  const restored = useGame((s) => s.shards.resonance);
  const fragmentCount = useGame((s) => s.fragmentsByShard.resonance);
  const restoreShard = useGame((s) => s.restoreShard);
  const locked = !restored && fragmentCount < FRAGMENTS_PER_SHARD;
  const solvedRef = useRef(false);

  const [target] = useState<number[]>(() => generateTarget());
  const [pitches, setPitches] = useState<number[]>(() => generateInitial(target));
  const forks = forkPositions(FORK_COUNT);
  const forkAngles = useMemo(
    () => Array.from({ length: FORK_COUNT }, (_, i) => (i / FORK_COUNT) * Math.PI * 2),
    [],
  );

  const matched = useMemo(
    () => matchedCount(pitches, target),
    [pitches, target],
  );
  const isAllMatched = allMatched(pitches, target);

  useEffect(() => {
    if (!restored) {
      solvedRef.current = false;
    }
  }, [restored]);

  useFrame(() => {
    if (solvedRef.current || restored || locked) return;
    if (isAllMatched) {
      solvedRef.current = true;
      Audio.shardRestored();
      restoreShard("resonance");
    }
  });

  const handleForkStrike = (index: number) => {
    if (locked || restored) return;
    const nextPitch = (pitches[index] + 1) % PITCH_COUNT;
    setPitches((prev) => cyclePitch(prev, index));
    Audio.forkTone(nextPitch);
  };

  return (
    <group>
      <CentralBeacon restored={restored} locked={locked} allMatched={isAllMatched} />

      {!restored && !locked && (
        <TargetIndicator target={target} forkAngles={forkAngles} />
      )}

      {locked && <LockDome position={[PX[0], terrainHeight(PX[0], PX[2]), PX[2]]} radius={8} />}

      {forks.map((pos, i) => (
        <TuningFork
          key={i}
          position={pos}
          index={i}
          pitch={pitches[i]}
          matched={!locked && !restored && pitches[i] === target[i]}
          onInteract={handleForkStrike}
          locked={locked}
          restored={restored}
        />
      ))}

      {restored && (
        <RestoredVisuals position={[PX[0], terrainHeight(PX[0], PX[2]), PX[2]]} yOffset={3.5} />
      )}

      <Billboard position={[PX[0], terrainHeight(PX[0], PX[2]) + 7, PX[2]]}>
        <Text
          fontSize={0.5}
          color={restored ? COLORS.shardRestored : locked ? "#ef4444" : COLORS.amber}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {restored ? "RESONANCE RESTORED" : locked ? "RESONANCE LOCKED" : "RESONANCE BLOOM"}
        </Text>
      </Billboard>

      {!restored && !locked && (
        <Billboard position={[PX[0], terrainHeight(PX[0], PX[2]) + 5.5, PX[2]]}>
          <Text
            fontSize={0.3}
            color={isAllMatched ? COLORS.shardRestored : COLORS.cyan}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000"
          >
            {`MATCH THE HARMONIC  ${matched}/${FORK_COUNT}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
