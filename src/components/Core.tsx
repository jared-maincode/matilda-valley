import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { useGame } from "../store";
import { Audio } from "../lib/Audio";
import { CORE_POSITION, COLORS } from "../constants";
import { getToonGradient } from "../lib/toon";

export function Core() {
  const orbRef = useRef<THREE.Mesh>(null);
  const orbMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const pillarRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const wonRef = useRef(false);
  const bloomRef = useRef<THREE.PointLight>(null);

  const shards = useGame((s) => s.shards);
  const resetNonce = useGame((s) => s.resetNonce);
  const restoredCount = Object.values(shards).filter(Boolean).length;
  const gradientMap = useMemo(() => getToonGradient(), []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const activeRatio = restoredCount / 3;

    if (orbMatRef.current) {
      const pulse = 0.6 + Math.sin(t * 2) * 0.15 + activeRatio * 0.4;
      orbMatRef.current.emissiveIntensity = pulse;
    }
    if (orbRef.current) {
      orbRef.current.rotation.y = t * 0.15;
      orbRef.current.rotation.x = t * 0.08;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.1;
    }
    if (pillarRef.current) {
      const targetY = restoredCount === 3 ? 8 : 0;
      pillarRef.current.position.y += (targetY - pillarRef.current.position.y) * delta * 1.5;
      const sc = 1 + Math.sin(t * 1.5) * 0.02;
      pillarRef.current.scale.set(sc, 1, sc);
    }
    if (bloomRef.current) {
      const target = restoredCount === 3 ? 8 : 0;
      bloomRef.current.intensity += (target - bloomRef.current.intensity) * delta * 2;
    }
  });

  useEffect(() => {
    if (restoredCount === 3 && !wonRef.current) {
      wonRef.current = true;
      Audio.win();
    }
  }, [restoredCount]);

  useEffect(() => {
    wonRef.current = false;
  }, [resetNonce]);

  const baseY = CORE_POSITION[1];
  const activeRatio = restoredCount / 3;

  return (
    <group position={[CORE_POSITION[0], baseY, CORE_POSITION[2]]}>
      {/* Base platform */}
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <cylinderGeometry args={[4, 5, 0.5, 8]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>

      {/* Rising pillar */}
      <mesh ref={pillarRef} position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.2, 6, 6]} />
        <meshToonMaterial
          color={COLORS.cyanGlow}
          gradientMap={gradientMap}
          emissive={COLORS.cyan}
          emissiveIntensity={activeRatio}
        />
      </mesh>

      {/* Core orb: solid, no transparency */}
      <group ref={groupRef} position={[0, 5, 0]}>
        <mesh ref={orbRef} castShadow>
          <icosahedronGeometry args={[1.2, 1]} />
          <meshStandardMaterial
            ref={orbMatRef}
            color={COLORS.cyan}
            emissive={COLORS.cyan}
            emissiveIntensity={0.6}
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>
      </group>

      {/* Bloom light */}
      <pointLight ref={bloomRef} position={[0, 5, 0]} intensity={0} color={COLORS.cyan} distance={50} />

      {/* Shard count floating text */}
      <Billboard position={[0, 8, 0]}>
        <Text
          fontSize={0.6}
          color={COLORS.cyan}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {restoredCount === 3 ? "MATILDA ONLINE" : `${restoredCount}/3 SHARDS`}
        </Text>
      </Billboard>
    </group>
  );
}
