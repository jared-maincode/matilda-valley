import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { COLORS } from "../constants";
import { getToonGradient } from "../lib/toon";

export function LockDome({
  position,
  radius = 9,
}: {
  position: [number, number, number];
  radius?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + Math.sin(clock.elapsedTime * 1.2) * 0.03;
      ref.current.rotation.y = clock.elapsedTime * 0.1;
    }
  });

  return (
    <mesh ref={ref} position={[position[0], position[1] + radius * 0.5, position[2]]}>
      <sphereGeometry args={[radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial
        color="#ef4444"
        transparent
        opacity={0.06}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export function RestoredVisuals({
  position,
  yOffset = 3.5,
}: {
  position: [number, number, number];
  yOffset?: number;
}) {
  const gradientMap = useMemo(() => getToonGradient(), []);

  return (
    <>
      <Float speed={3} rotationIntensity={1} floatIntensity={1}>
        <mesh position={[position[0], position[1] + yOffset, position[2]]}>
          <octahedronGeometry args={[0.5, 0]} />
          <meshToonMaterial
            color={COLORS.shardRestored}
            gradientMap={gradientMap}
            emissive={COLORS.shardRestored}
            emissiveIntensity={1}
            transparent
            opacity={0.7}
          />
        </mesh>
      </Float>
      <Sparkles
        count={30}
        scale={[4, 4, 4]}
        position={[position[0], position[1] + 2, position[2]]}
        size={3}
        speed={0.4}
        color={COLORS.shardRestored}
      />
    </>
  );
}
