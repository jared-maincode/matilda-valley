import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../store";
import { footprints, clearFootprints } from "../lib/footprints";
import { getParticleTexture } from "../lib/textures";

const FOOTPRINT_LIFETIME = 5;
const POOL_SIZE = 60;

export function Footprints() {
  const phase = useGame((s) => s.phase);
  const resetNonce = useGame((s) => s.resetNonce);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const matRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const texture = useMemo(() => getParticleTexture(), []);

  useEffect(() => {
    clearFootprints();
  }, [resetNonce]);

  useFrame(() => {
    const now = performance.now();
    while (footprints.length > 0 && (now - footprints[0].startTime) / 1000 > FOOTPRINT_LIFETIME) {
      footprints.shift();
    }

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = meshRefs.current[i];
      const mat = matRefs.current[i];
      if (!mesh || !mat) continue;

      if (i < footprints.length) {
        const fp = footprints[i];
        const offset = fp.side * 0.16;
        mesh.position.set(
          fp.x + Math.sin(fp.heading) * offset,
          fp.y,
          fp.z - Math.cos(fp.heading) * offset,
        );
        mesh.rotation.set(-Math.PI / 2, 0, fp.heading);
        mesh.visible = true;

        const age = (now - fp.startTime) / 1000;
        const progress = Math.min(age / FOOTPRINT_LIFETIME, 1);
        mat.opacity = 0.35 * (1 - progress);
      } else {
        mesh.visible = false;
      }
    }
  });

  if (phase !== "playing" && phase !== "paused") return null;

  return (
    <>
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => { meshRefs.current[i] = m; }}
          visible={false}
        >
          <planeGeometry args={[0.22, 0.3]} />
          <meshBasicMaterial
            ref={(m) => { matRefs.current[i] = m; }}
            map={texture}
            color="#1a2744"
            transparent
            depthWrite={false}
            opacity={0}
          />
        </mesh>
      ))}
    </>
  );
}
