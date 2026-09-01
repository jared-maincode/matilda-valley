import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Clouds, Cloud, Sparkles } from "@react-three/drei";
import {
  WORLD_SIZE,
  TERRAIN_SEGMENTS,
  COLORS,
  CORE_POSITION,
  WATER_LEVEL,
} from "../constants";
import { terrainHeight } from "../lib/terrain";
import { useToonGradient } from "../lib/toon";
import { getParticleTexture } from "../lib/textures";
import { envState } from "../lib/environmentState";
import { registerSolid } from "../lib/collision";
import { useGame } from "../store";
import { AmbientStructures } from "./AmbientStructures";

const DAY_CYCLE_SECONDS = 300;

const SKY_DAY = {
  top: new THREE.Color(COLORS.skyTop),
  mid: new THREE.Color(COLORS.sky),
  horizon: new THREE.Color(COLORS.skyHorizon),
};
const SKY_NIGHT = {
  top: new THREE.Color("#121638"),
  mid: new THREE.Color("#252a55"),
  horizon: new THREE.Color("#353c65"),
};
const SKY_DUSK = {
  top: new THREE.Color("#2a1a4a"),
  mid: new THREE.Color("#8a4a3a"),
  horizon: new THREE.Color("#e8a060"),
};

const FOG_DAY = new THREE.Color(COLORS.fog);
const FOG_NIGHT = new THREE.Color("#252b50");

const BG_DAY = new THREE.Color(COLORS.sky);
const BG_NIGHT = new THREE.Color("#252a55");

const LIGHT_DAY = new THREE.Color("#fff0c0");
const LIGHT_NIGHT = new THREE.Color("#6080c0");

const AMBIENT_DAY = new THREE.Color("#b0d4f1");
const AMBIENT_NIGHT = new THREE.Color("#304560");

const DUSK_FOG = new THREE.Color("#d4a070");
const DUSK_LIGHT = new THREE.Color("#ff8040");

const _scratchFog = new THREE.Color();
const _scratchBg = new THREE.Color();

function SkyDome() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geo = useMemo(() => new THREE.SphereGeometry(300, 32, 16), []);

  useFrame(() => {
    if (!matRef.current) return;
    const t = envState.cycleTime / DAY_CYCLE_SECONDS;
    const phase = t % 1;
    const sunHeight = Math.sin(phase * Math.PI * 2);
    const dayness = THREE.MathUtils.smoothstep(sunHeight, -0.15, 0.15);
    const dusk = 1 - THREE.MathUtils.clamp(Math.abs(sunHeight) * 3, 0, 1);

    const u = matRef.current.uniforms;
    u.topColor.value.copy(SKY_NIGHT.top).lerp(SKY_DAY.top, dayness);
    u.topColor.value.lerp(SKY_DUSK.top, dusk * 0.6);
    u.midColor.value.copy(SKY_NIGHT.mid).lerp(SKY_DAY.mid, dayness);
    u.midColor.value.lerp(SKY_DUSK.mid, dusk * 0.6);
    u.horizonColor.value.copy(SKY_NIGHT.horizon).lerp(SKY_DAY.horizon, dayness);
    u.horizonColor.value.lerp(SKY_DUSK.horizon, dusk * 0.7);
  });

  return (
    <mesh geometry={geo}>
      <shaderMaterial
        ref={matRef}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={{
          topColor: { value: new THREE.Color(COLORS.skyTop) },
          midColor: { value: new THREE.Color(COLORS.sky) },
          horizonColor: { value: new THREE.Color(COLORS.skyHorizon) },
        }}
        vertexShader={`
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `}
        fragmentShader={`
          uniform vec3 topColor;
          uniform vec3 midColor;
          uniform vec3 horizonColor;
          varying vec3 vWorldPos;
          void main() {
            float h = normalize(vWorldPos).y;
            vec3 c;
            if (h > 0.25) {
              c = mix(midColor, topColor, smoothstep(0.25, 1.0, h));
            } else {
              c = mix(horizonColor, midColor, smoothstep(0.0, 0.25, h));
            }
            gl_FragColor = vec4(c, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function DayNightController() {
  const { scene } = useThree();
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambLightRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  const resetNonce = useGame((s) => s.resetNonce);

  useEffect(() => {
    envState.cycleTime = 0;
  }, [resetNonce]);

  useFrame((_, delta) => {
    if (useGame.getState().phase === "playing") {
      envState.cycleTime += delta;
    }
    const t = envState.cycleTime / DAY_CYCLE_SECONDS;
    const phase = t % 1;
    const sunHeight = Math.sin(phase * Math.PI * 2);
    const dayness = THREE.MathUtils.smoothstep(sunHeight, -0.15, 0.15);
    const dusk = 1 - THREE.MathUtils.clamp(Math.abs(sunHeight) * 3, 0, 1);

    const fogColor = _scratchFog.copy(FOG_NIGHT).lerp(FOG_DAY, dayness);
    fogColor.lerp(DUSK_FOG, dusk * 0.3);

    const bgColor = _scratchBg.copy(BG_NIGHT).lerp(BG_DAY, dayness);

    envState.fogColor.copy(fogColor);
    envState.bgColor.copy(bgColor);
    envState.dayness = dayness;
    envState.sunHeight = sunHeight;

    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.copy(fogColor);
    }
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(bgColor);
    }

    if (dirLightRef.current) {
      const angle = phase * Math.PI * 2;
      dirLightRef.current.position.set(
        Math.cos(angle) * 50,
        Math.max(sunHeight * 50, 5),
        20,
      );
      dirLightRef.current.intensity = 0.4 + dayness * 1.0;
      dirLightRef.current.color.copy(LIGHT_NIGHT).lerp(LIGHT_DAY, dayness);
      dirLightRef.current.color.lerp(DUSK_LIGHT, dusk * 0.4);
    }

    if (ambLightRef.current) {
      ambLightRef.current.intensity = 0.22 + dayness * 0.13;
      ambLightRef.current.color.copy(AMBIENT_NIGHT).lerp(AMBIENT_DAY, dayness);
    }

    if (hemiRef.current) {
      hemiRef.current.intensity = 0.18 + dayness * 0.07;
    }
  });

  return (
    <>
      <ambientLight ref={ambLightRef} intensity={0.35} color="#b0d4f1" />
      <directionalLight
        ref={dirLightRef}
        position={[30, 50, 20]}
        intensity={1.4}
        color="#fff0c0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <hemisphereLight ref={hemiRef} args={["#5dade2", "#6ab04c", 0.25]} />
    </>
  );
}

function TerrainMesh() {
  const gradientMap = useToonGradient();

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      WORLD_SIZE,
      WORLD_SIZE,
      TERRAIN_SEGMENTS,
      TERRAIN_SEGMENTS,
    );
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors: number[] = [];
    const sand = new THREE.Color("#c4a97d");
    const grass = new THREE.Color(COLORS.grass);
    const grassDark = new THREE.Color(COLORS.grassDark);
    const rock = new THREE.Color(COLORS.rock);
    const snow = new THREE.Color(COLORS.snow);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrainHeight(x, z);
      pos.setY(i, h);

      const c = new THREE.Color();
      if (h < -1) {
        c.copy(sand);
      } else if (h < 3) {
        const t = (h + 1) / 4;
        c.copy(sand).lerp(grass, t);
      } else if (h < 6) {
        const t = (h - 3) / 3;
        c.copy(grass).lerp(grassDark, t);
      } else if (h < 12) {
        const t = (h - 6) / 6;
        c.copy(grassDark).lerp(rock, t);
      } else {
        const t = Math.min((h - 12) / 12, 1);
        c.copy(rock).lerp(snow, t);
      }
      colors.push(c.r, c.g, c.b);
    }

    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshToonMaterial
        vertexColors
        gradientMap={gradientMap}
      />
    </mesh>
  );
}

function WaterPlane() {
  const ref = useRef<THREE.Mesh>(null);
  const gradientMap = useToonGradient();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 24, 24);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      const pos = ref.current.geometry.attributes.position;
      const halfWorld = WORLD_SIZE / 2;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const distFromCenter = Math.sqrt(x * x + z * z);
        const falloff = THREE.MathUtils.smoothstep(distFromCenter, 0, halfWorld * 0.7);
        const wave = (Math.sin(x * 0.12 + t * 0.5) * 0.12
          + Math.cos(z * 0.10 + t * 0.35) * 0.10) * falloff;
        pos.setY(i, wave);
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <mesh ref={ref} geometry={geo} position={[0, WATER_LEVEL, 0]} receiveShadow>
      <meshToonMaterial
        color={COLORS.water}
        gradientMap={gradientMap}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

interface MountainPeak {
  x: number;
  z: number;
  height: number;
  width: number;
}

function buildMountainPeaks(): MountainPeak[] {
  const peaks: MountainPeak[] = [];
  const count = 36;
  const rand = (() => {
    let s = 12345;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  })();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.12;
    const radius = 75 + rand() * 8;
    const h = 20 + rand() * 24;
    const w = 9 + rand() * 5;
    peaks.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      height: h,
      width: w,
    });
  }
  return peaks;
}

const MOUNTAIN_PEAKS = buildMountainPeaks();

function Mountains() {
  const gradientMap = useToonGradient();

  useEffect(() => {
    const unregs = MOUNTAIN_PEAKS.map((p, i) =>
      registerSolid(`mountain-${i}`, p.x, p.z, p.width * 0.8, "cone", -2, p.height),
    );
    return () => unregs.forEach((u) => u());
  }, []);

  return useMemo(() => {
    const peaks: React.JSX.Element[] = [];

    for (let i = 0; i < MOUNTAIN_PEAKS.length; i++) {
      const { x, z, height: h, width: w } = MOUNTAIN_PEAKS[i];
      const hasSnow = h > 28;

      peaks.push(
        <group key={i} position={[x, h / 2 - 2, z]}>
          <mesh castShadow>
            <coneGeometry args={[w, h, 7, 1]} />
            <meshToonMaterial
              color={COLORS.mountain}
              gradientMap={gradientMap}
            />
          </mesh>
          {hasSnow && (
            <mesh position={[0, h * 0.28, 0]}>
              <coneGeometry args={[w * 0.4, h * 0.3, 7, 1]} />
              <meshToonMaterial
                color={COLORS.mountainCap}
                gradientMap={gradientMap}
              />
            </mesh>
          )}
        </group>,
      );
    }
    return <>{peaks}</>;
  }, [gradientMap]);
}

function CartoonClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={50}>
      <Cloud
        position={[-30, 45, -20]}
        speed={0.15}
        opacity={0.7}
        color="#ffffff"
        segments={20}
        bounds={[12, 4, 8]}
        volume={8}
      />
      <Cloud
        position={[35, 50, -10]}
        speed={0.12}
        opacity={0.65}
        color="#ffffff"
        segments={16}
        bounds={[10, 3, 6]}
        volume={6}
      />
      <Cloud
        position={[10, 55, 30]}
        speed={0.1}
        opacity={0.6}
        color="#f0f4ff"
        segments={14}
        bounds={[8, 3, 5]}
        volume={5}
      />
      <Cloud
        position={[-45, 42, 25]}
        speed={0.18}
        opacity={0.55}
        color="#fff8f0"
        segments={12}
        bounds={[7, 3, 4]}
        volume={4}
      />
    </Clouds>
  );
}

function DayNightParticles() {
  const dayRef = useRef<THREE.Points>(null);
  const nightRef = useRef<THREE.Points>(null);
  const particleTex = useMemo(() => getParticleTexture(), []);

  const dayGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * WORLD_SIZE * 0.6;
      pos[i * 3 + 1] = 2 + Math.random() * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * WORLD_SIZE * 0.6;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const nightGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 80;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * WORLD_SIZE * 0.5;
      pos[i * 3 + 1] = 1 + Math.random() * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * WORLD_SIZE * 0.5;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const dayness = envState.dayness;

    if (dayRef.current) {
      const mat = dayRef.current.material as THREE.PointsMaterial;
      mat.opacity = dayness * 0.35;
      dayRef.current.rotation.y = t * 0.01;
      const pos = dayRef.current.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setY(i, y + Math.sin(t * 0.5 + i) * 0.002);
      }
      pos.needsUpdate = true;
    }

    if (nightRef.current) {
      const mat = nightRef.current.material as THREE.PointsMaterial;
      const visible = 1 - dayness;
      mat.opacity = visible * (0.4 + Math.sin(t * 2) * 0.15);
      const pos = nightRef.current.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setX(i, x + Math.sin(t * 0.3 + i * 0.7) * 0.01);
        pos.setZ(i, z + Math.cos(t * 0.4 + i * 0.5) * 0.01);
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <>
      <points ref={dayRef} geometry={dayGeo}>
        <pointsMaterial
          color="#fff5d0"
          size={0.3}
          transparent
          opacity={0.3}
          depthWrite={false}
          sizeAttenuation
          map={particleTex}
        />
      </points>
      <points ref={nightRef} geometry={nightGeo}>
        <pointsMaterial
          color="#c0e0ff"
          size={0.5}
          transparent
          opacity={0}
          depthWrite={false}
          sizeAttenuation
          map={particleTex}
        />
      </points>
    </>
  );
}

export function World() {
  return (
    <>
      <color attach="background" args={[COLORS.sky]} />
      <fog attach="fog" args={[COLORS.fog, 50, 160]} />

      <SkyDome />
      <DayNightController />
      <CartoonClouds />

      <TerrainMesh />
      <WaterPlane />
      <Mountains />
      <AmbientStructures />

      <DayNightParticles />

      <Sparkles
        count={120}
        scale={[WORLD_SIZE * 0.5, 15, WORLD_SIZE * 0.5]}
        position={[0, 8, 0]}
        size={3}
        speed={0.2}
        opacity={0.5}
        color={COLORS.cyan}
      />

      <pointLight
        position={[CORE_POSITION[0], 8, CORE_POSITION[2]]}
        intensity={2}
        color={COLORS.cyan}
        distance={60}
      />
    </>
  );
}
