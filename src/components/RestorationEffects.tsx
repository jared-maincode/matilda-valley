import { useRef, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../store";
import { PUZZLE_POSITIONS, COLORS } from "../constants";
import { terrainHeight } from "../lib/terrain";
import { getParticleTexture } from "../lib/textures";
import type { ShardId } from "../store";

interface Burst {
  id: number;
  position: [number, number, number];
  startTime: number;
}

const BURST_DURATION = 2.5;
const PARTICLE_COUNT = 60;

function BurstEffect({ burst, onComplete }: { burst: Burst; onComplete: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const elapsed = useRef(0);
  const completed = useRef(false);

  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      arr[i * 3] = Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = Math.cos(phi);
      arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  const velocities = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const speed = 3 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.7;
      arr[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      arr[i * 3 + 1] = Math.cos(phi) * speed;
      arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;
    const progress = Math.min(t / BURST_DURATION, 1);

    if (lightRef.current) {
      lightRef.current.intensity = (1 - progress) * 5;
    }

    if (particlesRef.current) {
      const geo = particlesRef.current.geometry;
      const posAttr = geo.attributes.position;
      const pos = posAttr.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3] += velocities[i * 3] * delta;
        pos[i * 3 + 1] += (velocities[i * 3 + 1] - 2 * delta * t) * delta;
        pos[i * 3 + 2] += velocities[i * 3 + 2] * delta;
      }
      posAttr.needsUpdate = true;
      const mat = particlesRef.current.material as THREE.PointsMaterial;
      mat.opacity = 1 - progress;
      mat.size = 0.3 * (1 - progress * 0.5);
    }

    if (groupRef.current) {
      const scale = 1 + progress * 3;
      groupRef.current.scale.set(scale, scale, scale);
      groupRef.current.rotation.y = t * 0.5;
    }

    if (progress >= 1 && !completed.current) {
      completed.current = true;
      onComplete();
    }
  });

  return (
    <group position={burst.position}>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color={COLORS.shardRestored}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>
      <pointLight ref={lightRef} color={COLORS.shardRestored} intensity={5} distance={30} />
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={COLORS.shardRestored}
          size={0.3}
          transparent
          opacity={1}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          map={getParticleTexture()}
        />
      </points>
    </group>
  );
}

export function RestorationEffects() {
  const shards = useGame((s) => s.shards);
  const phase = useGame((s) => s.phase);
  const resetNonce = useGame((s) => s.resetNonce);
  const burstsRef = useRef<Burst[]>([]);
  const prevShards = useRef<Record<ShardId, boolean>>({ ...shards });
  const [, forceUpdate] = useState(0);
  const burstId = useRef(0);

  useEffect(() => {
    burstsRef.current = [];
    prevShards.current = { signal: false, resonance: false, memory: false };
    forceUpdate((n) => n + 1);
  }, [resetNonce]);

  useEffect(() => {
    (Object.keys(shards) as ShardId[]).forEach((key) => {
      if (shards[key] && !prevShards.current[key]) {
        const p = PUZZLE_POSITIONS[key];
        const y = terrainHeight(p[0], p[2]) + 2;
        burstsRef.current.push({
          id: burstId.current++,
          position: [p[0], y, p[2]],
          startTime: performance.now(),
        });
        forceUpdate((n) => n + 1);
      }
    });
    prevShards.current = { ...shards };
  }, [shards]);

  const removeBurst = (id: number) => {
    burstsRef.current = burstsRef.current.filter((b) => b.id !== id);
    forceUpdate((n) => n + 1);
  };

  if (phase !== "playing") return null;

  return (
    <>
      {burstsRef.current.map((b) => (
        <BurstEffect key={b.id} burst={b} onComplete={() => removeBurst(b.id)} />
      ))}
    </>
  );
}
