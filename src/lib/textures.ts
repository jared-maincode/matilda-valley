import * as THREE from "three";

function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = noise2D(ix, iy, seed);
  const b = noise2D(ix + 1, iy, seed);
  const c = noise2D(ix, iy + 1, seed);
  const d = noise2D(ix + 1, iy + 1, seed);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}

function fbm(x: number, y: number, octaves: number, seed: number): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, seed + i * 17) * amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function createCanvas(size: number): [CanvasRenderingContext2D, HTMLCanvasElement] {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  return [ctx, canvas];
}

function makeNormalMap(heightData: Float32Array, size: number, strength: number): THREE.CanvasTexture {
  const [ctx, canvas] = createCanvas(size);
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = heightData[y * size + Math.max(0, x - 1)];
      const xr = heightData[y * size + Math.min(size - 1, x + 1)];
      const yu = heightData[Math.max(0, y - 1) * size + x];
      const yd = heightData[Math.min(size - 1, y + 1) * size + x];

      const dx = (xr - xl) * strength;
      const dy = (yd - yu) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);

      const idx = (y * size + x) * 4;
      data[idx] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[idx + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      data[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeGrassAlbedo(): THREE.CanvasTexture {
  const size = 256;
  const [ctx, canvas] = createCanvas(size);
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 8;
      const v = (y / size) * 8;
      const n = fbm(u, v, 4, 1);
      const n2 = fbm(u * 3, v * 3, 3, 5);

      const base = n * 0.6 + n2 * 0.4;
      const r = lerp(34, 72, base) + (n2 - 0.5) * 20;
      const g = lerp(58, 110, base) + (n2 - 0.5) * 25;
      const b = lerp(38, 55, base) + (n2 - 0.5) * 12;

      const idx = (y * size + x) * 4;
      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 400; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const len = 3 + Math.random() * 6;
    ctx.strokeStyle = `rgb(${20 + Math.random() * 20},${40 + Math.random() * 30},${20 + Math.random() * 15})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (Math.random() - 0.5) * 2, py - len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRockAlbedo(): THREE.CanvasTexture {
  const size = 256;
  const [ctx, canvas] = createCanvas(size);
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 6;
      const v = (y / size) * 6;
      const n = fbm(u, v, 5, 10);
      const crack = Math.abs(smoothNoise(u * 2, v * 2, 20) - 0.5);

      const base = n;
      let r = lerp(50, 90, base);
      let g = lerp(50, 85, base);
      let b = lerp(55, 95, base);

      if (crack < 0.04) {
        r *= 0.5;
        g *= 0.5;
        b *= 0.5;
      }

      const idx = (y * size + x) * 4;
      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeHeightData(size: number, seed: number, scale: number): Float32Array {
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * scale;
      const v = (y / size) * scale;
      heights[y * size + x] = fbm(u, v, 4, seed);
    }
  }
  return heights;
}

let particleTex: THREE.CanvasTexture | null = null;

export function getParticleTexture(): THREE.CanvasTexture {
  if (particleTex) return particleTex;
  const size = 64;
  const [ctx, canvas] = createCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  particleTex = new THREE.CanvasTexture(canvas);
  return particleTex;
}

const WATTLE_PETALS = [
  "M5.57666 7.60694C7.61189 8.43813 13.0131 13.2338 12.4121 14.7054C11.8111 16.177 4.59685 15.8206 2.56163 14.9894C0.5264 14.1582 -0.549403 11.7905 0.283176 9.75193C1.11576 7.71334 3.54143 6.77572 5.57666 7.60694Z",
  "M5.57666 24.7566C7.61189 23.9254 13.0131 19.1297 12.4121 17.6581C11.8111 16.1865 4.59685 16.5429 2.56163 17.3742C0.5264 18.2054 -0.549403 20.573 0.283176 22.6116C1.11576 24.6502 3.54143 25.5878 5.57666 24.7566Z",
  "M26.7841 7.60694C24.7489 8.43813 19.3477 13.2338 19.9487 14.7054C20.5497 16.177 27.7639 15.8206 29.7992 14.9894C31.8342 14.1582 32.9103 11.7905 32.0777 9.75193C31.2451 7.71334 28.8194 6.77572 26.7841 7.60694Z",
  "M26.7841 24.7566C24.7489 23.9254 19.3477 19.1297 19.9487 17.6581C20.5497 16.1865 27.7639 16.5429 29.7992 17.3742C31.8342 18.2054 32.9103 20.573 32.0777 22.6116C31.2451 24.6502 28.8194 25.5878 26.7841 24.7566Z",
  "M24.6277 5.57666C23.7965 7.61189 19.0008 13.0131 17.5291 12.4121C16.0575 11.8111 16.4141 4.59685 17.2453 2.56163C18.0764 0.5264 20.4441 -0.549403 22.4827 0.283176C24.5213 1.11576 25.4589 3.54143 24.6277 5.57666Z",
  "M7.47413 5.57666C8.30532 7.61189 13.101 13.0131 14.5726 12.4121C16.0442 11.8111 15.6877 4.59685 14.8566 2.56163C14.0254 0.5264 11.6577 -0.549403 9.61911 0.283176C7.58053 1.11576 6.64291 3.54143 7.47413 5.57666Z",
  "M24.6277 26.7841C23.7965 24.7489 19.0008 19.3477 17.5291 19.9487C16.0575 20.5497 16.4141 27.7639 17.2453 29.7992C18.0764 31.8342 20.4441 32.9103 22.4827 32.0777C24.5213 31.2451 25.4589 28.8194 24.6277 26.7841Z",
  "M7.47412 26.7841C8.30531 24.7489 13.101 19.3477 14.5726 19.9487C16.0442 20.5497 15.6877 27.7639 14.8565 29.7992C14.0254 31.8342 11.6577 32.9103 9.6191 32.0777C7.58052 31.2451 6.64293 28.8194 7.47412 26.7841Z",
];

let wattleTex: THREE.CanvasTexture | null = null;

export function getWattleMarkTexture(): THREE.CanvasTexture {
  if (wattleTex) return wattleTex;
  const size = 128;
  const [ctx, canvas] = createCanvas(size);
  const scale = size / 33;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#FFC300";
  for (const d of WATTLE_PETALS) {
    const p = new Path2D(d);
    ctx.fill(p);
  }
  wattleTex = new THREE.CanvasTexture(canvas);
  wattleTex.colorSpace = THREE.SRGBColorSpace;
  return wattleTex;
}

export interface TerrainTextures {
  grassMap: THREE.CanvasTexture;
  rockMap: THREE.CanvasTexture;
  grassNormal: THREE.CanvasTexture;
  rockNormal: THREE.CanvasTexture;
}

let cached: TerrainTextures | null = null;

export function getTerrainTextures(): TerrainTextures {
  if (cached) return cached;

  const grassMap = makeGrassAlbedo();
  const rockMap = makeRockAlbedo();

  const grassHeights = makeHeightData(256, 1, 8);
  const rockHeights = makeHeightData(256, 10, 6);

  const grassNormal = makeNormalMap(grassHeights, 256, 8);
  const rockNormal = makeNormalMap(rockHeights, 256, 6);

  cached = { grassMap, rockMap, grassNormal, rockNormal };
  return cached;
}
