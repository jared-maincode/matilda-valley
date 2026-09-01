import * as THREE from "three";
import { useMemo } from "react";

function createGradientMap(bands: number): THREE.DataTexture {
  const data = new Uint8Array(bands);
  for (let i = 0; i < bands; i++) {
    data[i] = Math.floor((i / (bands - 1)) * 255);
  }
  const tex = new THREE.DataTexture(data, bands, 1, THREE.RedFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

let cached3: THREE.DataTexture | null = null;

export function useToonGradient(): THREE.DataTexture {
  return useMemo(() => {
    if (!cached3) {
      cached3 = createGradientMap(3);
    }
    return cached3;
  }, []);
}

export function getToonGradient(): THREE.DataTexture {
  if (!cached3) {
    cached3 = createGradientMap(3);
  }
  return cached3;
}
