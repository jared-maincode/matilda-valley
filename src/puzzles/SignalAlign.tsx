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
import { MIRROR_ANGLES, MIRRORS, computeBeamPath, alignedCount, type Mirror } from "./signalAlignLogic";

const PX = PUZZLE_POSITIONS.signal;
const SOURCE_POS: [number, number, number] = [PX[0] - 7, 0, PX[2] - 5];
const RECEIVER_POS: [number, number, number] = [PX[0] + 7, 0, PX[2] + 5];

const _identityScale = new THREE.Vector3(1, 1, 1);

function MirrorPrism({ mirror, index, onInteract, locked, aligned, restored }: {
  mirror: Mirror; index: number; onInteract: (index: number) => void; locked: boolean; aligned: boolean; restored: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const yBase = terrainHeight(mirror.pos[0], mirror.pos[2]) + 2.5;
  const gradientMap = useMemo(() => getToonGradient(), []);
  const angle = MIRROR_ANGLES[mirror.angleIndex];

  useEffect(() => {
    const obj = ref.current;
    if (!obj) return;
    return registerInteractable({
      id: `signal:mirror-${index}`,
      object: obj,
      prompt: locked
        ? `Locked: collect ${FRAGMENTS_PER_SHARD} signal fragments`
        : restored
          ? ""
          : `[E] Rotate mirror ${index + 1}`,
    });
  }, [index, locked, restored]);

  useEffect(() => {
    if (locked || restored) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string };
      if (detail.id === `signal:mirror-${index}`) onInteract(index);
    };
    window.addEventListener("interact", handler);
    return () => window.removeEventListener("interact", handler);
  }, [index, onInteract, locked, restored]);

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const mat = glowRef.current.material as THREE.MeshToonMaterial;
    if (aligned) {
      mat.emissiveIntensity = 0.6 + Math.sin(clock.elapsedTime * 4) * 0.15;
      glowRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.04);
    } else {
      mat.emissiveIntensity = 0.2;
      glowRef.current.scale.lerp(_identityScale, 0.15);
    }
  });

  return (
    <group ref={ref} position={[mirror.pos[0], yBase, mirror.pos[2]]}>
      <mesh castShadow rotation={[0, angle, 0]}>
        <boxGeometry args={[0.15, 2, 1.2]} />
        <meshToonMaterial color={aligned ? COLORS.cyan : COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      <mesh ref={glowRef} position={[0, 0, 0]} rotation={[0, angle, 0]}>
        <boxGeometry args={[0.18, 2.1, 1.3]} />
        <meshToonMaterial
          color={aligned ? COLORS.cyanGlow : COLORS.stone}
          gradientMap={gradientMap}
          emissive={aligned ? COLORS.cyanGlow : COLORS.stone}
          emissiveIntensity={0.2}
          transparent
          opacity={0.4}
        />
      </mesh>
      <mesh position={[0, -1.3, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 0.3, 8]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      {aligned && <pointLight position={[0, 0.5, 0]} intensity={0.8} color={COLORS.cyanGlow} distance={3} />}
    </group>
  );
}

function SignalSource({ locked }: { locked: boolean }) {
  const yBase = terrainHeight(SOURCE_POS[0], SOURCE_POS[2]);
  const gradientMap = useMemo(() => getToonGradient(), []);
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.5;
  });

  return (
    <group position={[SOURCE_POS[0], yBase, SOURCE_POS[2]]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.3, 12]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      <mesh ref={ref} position={[0, 1.5, 0]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshToonMaterial
          color={locked ? "#ef4444" : COLORS.amber}
          gradientMap={gradientMap}
          emissive={locked ? "#ef4444" : COLORS.amber}
          emissiveIntensity={0.6}
        />
      </mesh>
      <pointLight position={[0, 1.5, 0]} intensity={1.5} color={locked ? "#ef4444" : COLORS.amber} distance={6} />
    </group>
  );
}

function SignalReceiver({ restored, reached }: { restored: boolean; reached: boolean }) {
  const yBase = terrainHeight(RECEIVER_POS[0], RECEIVER_POS[2]);
  const gradientMap = useMemo(() => getToonGradient(), []);
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.3;
    if (reached) {
      ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.06);
    }
  });

  const color = restored ? COLORS.shardRestored : reached ? COLORS.cyan : COLORS.stone;

  return (
    <group position={[RECEIVER_POS[0], yBase, RECEIVER_POS[2]]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.7, 0.9, 0.3, 12]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      <mesh ref={ref} position={[0, 1.5, 0]}>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshToonMaterial color={color} gradientMap={gradientMap} emissive={color} emissiveIntensity={reached ? 0.8 : 0.3} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} intensity={reached ? 2 : 0.5} color={color} distance={8} />
    </group>
  );
}

function BeamSegment({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    return { position: mid, quaternion: quat, length: len };
  }, [from, to]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.5 + Math.sin(clock.elapsedTime * 6) * 0.15;
  });

  return (
    <mesh ref={ref} position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.06, 0.06, length, 8]} />
      <meshBasicMaterial
        color={COLORS.cyan}
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Beam({ points, active }: { points: THREE.Vector3[]; active: boolean }) {
  if (!active || points.length < 2) return null;
  const segments: React.JSX.Element[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push(
      <BeamSegment key={i} from={points[i]} to={points[i + 1]} />,
    );
  }
  return <>{segments}</>;
}

export function SignalAlign() {
  const restored = useGame((s) => s.shards.signal);
  const fragmentCount = useGame((s) => s.fragmentsByShard.signal);
  const restoreShard = useGame((s) => s.restoreShard);
  const locked = !restored && fragmentCount < FRAGMENTS_PER_SHARD;
  const solvedRef = useRef(false);

  const [mirrors, setMirrors] = useState<Mirror[]>(() => MIRRORS.map((m) => ({ ...m })));
  const beamPath = useMemo(() => computeBeamPath(mirrors), [mirrors]);
  const reached = beamPath.length === MIRRORS.length + 2;
  const aligned = alignedCount(beamPath);

  useEffect(() => {
    if (!restored) {
      solvedRef.current = false;
    }
  }, [restored]);

  useFrame(() => {
    if (solvedRef.current || restored || locked) return;
    if (reached) {
      solvedRef.current = true;
      Audio.shardRestored();
      restoreShard("signal");
    }
  });

  const handleRotate = (index: number) => {
    if (locked || restored) return;
    const prevMirrors = mirrors.map((m) => ({ ...m }));
    const nextMirrors = prevMirrors.map((m, i) => (i === index ? { ...m, angleIndex: (m.angleIndex + 1) % MIRROR_ANGLES.length } : m));
    const prevAlignedCount = alignedCount(computeBeamPath(prevMirrors));
    const nextAlignedCount = alignedCount(computeBeamPath(nextMirrors));
    setMirrors(nextMirrors);
    Audio.beam();
    if (nextAlignedCount > prevAlignedCount) {
      Audio.correct();
    } else if (nextAlignedCount < prevAlignedCount) {
      Audio.wrong();
    }
  };

  return (
    <group>
      <SignalSource locked={locked} />
      <SignalReceiver restored={restored} reached={reached} />

      {mirrors.map((m, i) => (
        <MirrorPrism
          key={i}
          mirror={m}
          index={i}
          onInteract={handleRotate}
          locked={locked}
          aligned={!locked && !restored && beamPath.length > i + 2}
          restored={restored}
        />
      ))}

      <Beam points={beamPath} active={!locked && !restored} />

      {locked && <LockDome position={[PX[0], terrainHeight(PX[0], PX[2]), PX[2]]} radius={9} />}

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
          {restored ? "SIGNAL RESTORED" : locked ? "SIGNAL LOCKED" : "SIGNAL ALIGN"}
        </Text>
      </Billboard>

      {!restored && !locked && (
        <Billboard position={[PX[0], terrainHeight(PX[0], PX[2]) + 5.5, PX[2]]}>
          <Text
            fontSize={0.3}
            color={reached ? COLORS.shardRestored : COLORS.cyan}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000"
          >
            {`ALIGN THE MIRRORS  ${aligned}/${MIRRORS.length}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
