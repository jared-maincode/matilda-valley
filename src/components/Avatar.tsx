import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { avatarState } from "../lib/avatarState";
import { playerTelemetry } from "../lib/playerState";
import { useGame } from "../store";
import { getToonGradient } from "../lib/toon";
import { getWattleMarkTexture, getParticleTexture } from "../lib/textures";
import { terrainHeight } from "../lib/terrain";
import { EYE_HEIGHT, PUZZLE_POSITIONS } from "../constants";

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

const ARM_SWING_WALK = 0.35;
const ARM_SWING_SPRINT = 0.6;
const LEG_SWING_WALK = 0.4;
const LEG_SWING_SPRINT = 0.65;
const BOB_WALK = 0.04;
const BOB_SPRINT = 0.08;

const PUZZLE_KEYS = Object.keys(PUZZLE_POSITIONS) as (keyof typeof PUZZLE_POSITIONS)[];

interface Spark {
  id: number;
  startTime: number;
  positions: Float32Array;
  velocities: Float32Array;
}

const SPARK_COUNT = 24;
const SPARK_DURATION = 0.8;

function CollectionBurst({ spark }: { spark: Spark }) {
  const pointsRef = useRef<THREE.Points>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;
    const progress = Math.min(t / SPARK_DURATION, 1);

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position;
      const pos = posAttr.array as Float32Array;
      for (let i = 0; i < SPARK_COUNT; i++) {
        pos[i * 3] += spark.velocities[i * 3] * delta;
        pos[i * 3 + 1] += spark.velocities[i * 3 + 1] * delta;
        pos[i * 3 + 2] += spark.velocities[i * 3 + 2] * delta;
      }
      posAttr.needsUpdate = true;
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = 1 - progress;
      mat.size = 0.25 * (1 - progress * 0.4);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[spark.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#22d3ee"
        size={0.25}
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={getParticleTexture()}
      />
    </points>
  );
}

export function Avatar() {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const visorMatRef = useRef<THREE.MeshToonMaterial>(null);
  const antennaMatRef = useRef<THREE.MeshToonMaterial>(null);
  const blobRef = useRef<THREE.Mesh>(null);
  const antennaTipRef = useRef<THREE.Mesh>(null);
  const feetLightRef = useRef<THREE.PointLight>(null);
  const antennaLightRef = useRef<THREE.PointLight>(null);

  const gradientMap = useMemo(() => getToonGradient(), []);
  const wattleTex = useMemo(() => getWattleMarkTexture(), []);

  const facingRef = useRef(0);
  const prevFacingRef = useRef(0);
  const walkPhase = useRef(0);
  const breathePhase = useRef(Math.random() * Math.PI * 2);
  const interactTimer = useRef(0);
  const collectTimer = useRef(0);
  const squashRef = useRef(0);
  const prevVelocityY = useRef(0);
  const prevGrounded = useRef(true);
  const weightShiftPhase = useRef(Math.random() * Math.PI * 2);

  const bodyColor = useMemo(() => new THREE.Color("#2a3f5f"), []);
  const accentColor = useMemo(() => new THREE.Color("#3d5a80"), []);
  const visorColor = useMemo(() => new THREE.Color("#22d3ee"), []);
  const darkColor = useMemo(() => new THREE.Color("#1a2744"), []);
  const coreColor = useMemo(() => new THREE.Color("#22d3ee"), []);

  const phase = useGame((s) => s.phase);
  const fragmentLore = useGame((s) => s.fragmentLore);
  const shards = useGame((s) => s.shards);

  const [sparks, setSparks] = useState<Spark[]>([]);
  const sparkId = useRef(0);
  const sparkTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    if (fragmentLore) {
      collectTimer.current = 0.9;

      const positions = new Float32Array(SPARK_COUNT * 3);
      const velocities = new Float32Array(SPARK_COUNT * 3);
      for (let i = 0; i < SPARK_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.6;
        const speed = 2 + Math.random() * 4;
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 1;
        positions[i * 3 + 2] = 0;
        velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[i * 3 + 1] = Math.cos(phi) * speed + 1;
        velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      }
      const id = sparkId.current++;
      setSparks((prev) => [...prev, { id, startTime: performance.now(), positions, velocities }]);
      const timeoutId = setTimeout(() => {
        sparkTimeouts.current.delete(timeoutId);
        setSparks((prev) => prev.filter((s) => s.id !== id));
      }, SPARK_DURATION * 1000 + 100);
      sparkTimeouts.current.add(timeoutId);
    }
  }, [fragmentLore]);

  useEffect(() => {
    const timeouts = sparkTimeouts.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const onInteract = () => {
      interactTimer.current = 0.6;
    };
    window.addEventListener("interact", onInteract);
    return () => window.removeEventListener("interact", onInteract);
  }, []);

  useFrame((state, delta) => {
    if (phase !== "playing" && phase !== "paused") return;

    const dt = Math.min(delta, 0.05);
    const root = rootRef.current;
    if (!root) return;

    const inWater = playerTelemetry.isInWater;
    const feetY = playerTelemetry.y - EYE_HEIGHT;
    root.position.set(playerTelemetry.x, feetY, playerTelemetry.z);

    const targetHeading = playerTelemetry.heading;
    prevFacingRef.current = facingRef.current;
    facingRef.current = lerpAngle(
      facingRef.current,
      targetHeading,
      1 - Math.exp(-12 * dt),
    );
    root.rotation.y = facingRef.current;

    let headingDelta = facingRef.current - prevFacingRef.current;
    while (headingDelta > Math.PI) headingDelta -= Math.PI * 2;
    while (headingDelta < -Math.PI) headingDelta += Math.PI * 2;
    avatarState.turnRate = headingDelta / dt;

    const speed = avatarState.moveSpeed;
    const moving = speed > 0.1;
    const sprinting = avatarState.isSprinting && moving;
    const swimming = inWater;

    if (interactTimer.current > 0) interactTimer.current -= dt;
    if (collectTimer.current > 0) collectTimer.current -= dt;
    const interacting = interactTimer.current > 0;
    const collecting = collectTimer.current > 0;

    if (avatarState.landingImpact > 0) {
      avatarState.landingImpact = Math.max(0, avatarState.landingImpact - dt * 5);
    }

    if (playerTelemetry.isGrounded && !prevGrounded.current && prevVelocityY.current < -3) {
      avatarState.landingImpact = 1;
      squashRef.current = 1;
    }
    prevGrounded.current = playerTelemetry.isGrounded;
    prevVelocityY.current = playerTelemetry.velocityY;

    if (squashRef.current > 0) {
      squashRef.current = Math.max(0, squashRef.current - dt * 5);
    }

    if (moving || swimming) {
      walkPhase.current += (swimming ? 4 : sprinting ? 14 : 8) * dt;
    }
    breathePhase.current += dt;
    weightShiftPhase.current += dt;

    const body = bodyRef.current;
    const head = headRef.current;
    const lArm = leftArmRef.current;
    const rArm = rightArmRef.current;
    const lLeg = leftLegRef.current;
    const rLeg = rightLegRef.current;
    const visor = visorMatRef.current;
    const antenna = antennaMatRef.current;
    const blob = blobRef.current;
    const antennaTip = antennaTipRef.current;
    const feetLight = feetLightRef.current;
    const antennaLight = antennaLightRef.current;

    const squash = squashRef.current;
    const squashY = 1 - squash * 0.15;
    const squashXZ = 1 + squash * 0.1;

    if (body) body.position.set(0, 0, 0);
    if (body) body.rotation.set(0, 0, 0);
    if (body) body.scale.set(squashXZ, squashY, squashXZ);
    if (head) head.rotation.set(0, 0, 0);
    if (lArm) lArm.rotation.set(0, 0, 0);
    if (rArm) rArm.rotation.set(0, 0, 0);
    if (lLeg) lLeg.rotation.set(0, 0, 0);
    if (rLeg) rLeg.rotation.set(0, 0, 0);

    if (phase === "paused") {
      if (visor) visor.emissiveIntensity = 0.3;
      return;
    }

    const turnLean = THREE.MathUtils.clamp(avatarState.turnRate * 0.15, -0.08, 0.08);

    let nearestPuzzleDist = Infinity;
    for (const key of PUZZLE_KEYS) {
      if (shards[key]) continue;
      const p = PUZZLE_POSITIONS[key];
      const dx = playerTelemetry.x - p[0];
      const dz = playerTelemetry.z - p[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestPuzzleDist) nearestPuzzleDist = dist;
    }
    const puzzleProximity = nearestPuzzleDist < 20 ? 1 - nearestPuzzleDist / 20 : 0;
    avatarState.puzzleProximity = puzzleProximity;

    if (collecting) {
      const t = collectTimer.current / 0.9;
      const joy = Math.sin((1 - t) * Math.PI);
      if (body) body.position.y = joy * 0.35;
      if (lArm) {
        lArm.rotation.z = 2.4;
        lArm.rotation.x = -0.3 * joy;
      }
      if (rArm) {
        rArm.rotation.z = -2.4;
        rArm.rotation.x = -0.3 * joy;
      }
      if (head) head.rotation.x = -0.2 * joy;
      if (visor) visor.emissiveIntensity = 1.5 * joy + 0.4;
    } else if (interacting) {
      const t = interactTimer.current / 0.6;
      const reach = Math.sin((1 - t) * Math.PI);
      if (lArm) lArm.rotation.x = -1.3 * reach;
      if (rArm) rArm.rotation.x = -1.3 * reach;
      if (body) body.rotation.x = 0.15 * reach;
      if (head) head.rotation.x = -0.1 * reach;
    } else if (!playerTelemetry.isGrounded && !inWater) {
      const rising = playerTelemetry.velocityY > 0;
      const apexBlend = THREE.MathUtils.clamp(1 - Math.abs(playerTelemetry.velocityY) / 6, 0, 1);
      const armRaise = rising ? 2.2 : 1.8 + apexBlend * 0.4;
      if (body) body.rotation.x = rising ? -0.15 : 0.05 + apexBlend * 0.05;
      if (body) body.rotation.z = turnLean;
      if (lArm) {
        lArm.rotation.x = -armRaise;
        lArm.rotation.z = 0.3;
      }
      if (rArm) {
        rArm.rotation.x = -armRaise;
        rArm.rotation.z = -0.3;
      }
      if (lLeg) lLeg.rotation.x = rising ? 0.4 : -0.2;
      if (rLeg) rLeg.rotation.x = rising ? 0.2 : -0.35;
      if (head) head.rotation.x = rising ? 0.1 : -0.05;
    } else if (swimming) {
      const p = walkPhase.current;
      if (body) {
        body.position.y = Math.sin(p * 2) * 0.06;
        body.rotation.z = turnLean;
      }
      if (lArm) {
        lArm.rotation.x = Math.sin(p) * 0.5;
        lArm.rotation.z = 0.3 + Math.sin(p) * 0.2;
      }
      if (rArm) {
        rArm.rotation.x = Math.sin(p + Math.PI) * 0.5;
        rArm.rotation.z = -0.3 - Math.sin(p) * 0.2;
      }
      if (lLeg) lLeg.rotation.x = Math.sin(p * 2) * 0.25;
      if (rLeg) rLeg.rotation.x = Math.sin(p * 2 + Math.PI) * 0.25;
    } else if (moving) {
      const p = walkPhase.current;
      const armSwing = sprinting ? ARM_SWING_SPRINT : ARM_SWING_WALK;
      const legSwing = sprinting ? LEG_SWING_SPRINT : LEG_SWING_WALK;
      const bob = sprinting ? BOB_SPRINT : BOB_WALK;

      if (lLeg) lLeg.rotation.x = Math.sin(p) * legSwing;
      if (rLeg) rLeg.rotation.x = Math.sin(p + Math.PI) * legSwing;
      if (lArm) lArm.rotation.x = Math.sin(p + Math.PI) * armSwing;
      if (rArm) rArm.rotation.x = Math.sin(p) * armSwing;

      if (body) {
        body.position.y = Math.abs(Math.sin(p * 2)) * bob;
        body.rotation.z = Math.sin(p * 2) * 0.02 + turnLean;
        if (sprinting) body.rotation.x = 0.12;
      }
      if (head) {
        head.rotation.x = sprinting ? 0.05 : 0;
        head.rotation.z = -turnLean * 0.5;
      }
      if (antennaTip && head) {
        const whip = sprinting ? 0.15 : 0.05;
        antennaTip.position.z = Math.sin(p * 2) * whip;
      }
    } else {
      const breathe = Math.sin(breathePhase.current * 2) * 0.015;
      const shift = Math.sin(weightShiftPhase.current * 0.5) * 0.03;
      if (body) {
        body.position.y = breathe;
        body.position.x = shift;
        body.rotation.z = shift * 0.3;
      }
      if (head) {
        head.rotation.y = Math.sin(breathePhase.current * 0.5) * 0.1;
        head.rotation.x = Math.sin(breathePhase.current * 0.7) * 0.03;
      }
      if (lArm) lArm.rotation.z = 0.08 + Math.sin(breathePhase.current * 2) * 0.02;
      if (rArm) rArm.rotation.z = -0.08 - Math.sin(breathePhase.current * 2) * 0.02;
      if (lLeg) lLeg.rotation.z = shift * 0.5;
      if (rLeg) rLeg.rotation.z = -shift * 0.5;
    }

    const sprintBoost = sprinting ? 0.4 : 0;
    const puzzleBoost = puzzleProximity * 0.5;
    if (visor) {
      visor.emissiveIntensity = 0.4 + Math.sin(breathePhase.current * 3) * 0.1 + sprintBoost + puzzleBoost;
    }
    if (antenna) {
      antenna.emissiveIntensity = 0.6 + Math.sin(breathePhase.current * 4) * 0.15 + puzzleBoost * 0.5;
    }

    const t = state.clock.elapsedTime;

    if (blob) {
      const terrainH = terrainHeight(playerTelemetry.x, playerTelemetry.z);
      const airHeight = feetY - terrainH;
      const blobOpacity = THREE.MathUtils.clamp(0.35 - airHeight * 0.08, 0.05, 0.35);
      const blobScale = THREE.MathUtils.clamp(1 - airHeight * 0.1, 0.3, 1);
      (blob.material as THREE.MeshBasicMaterial).opacity = blobOpacity;
      blob.scale.set(blobScale, blobScale, blobScale);
      blob.position.y = terrainH - feetY + 0.02;
      blob.rotation.z = t * 0.1;
    }

    if (feetLight) {
      const lightIntensity = 0.12 + sprintBoost * 0.1 + puzzleBoost * 0.15;
      feetLight.intensity = lightIntensity + Math.sin(t * 6) * 0.02;
    }
    if (antennaLight) {
      antennaLight.intensity = 0.3 + Math.sin(t * 4) * 0.1 + puzzleBoost * 0.3;
    }
  });

  return (
    <group ref={rootRef} visible={phase === "playing" || phase === "paused"}>
      <group ref={bodyRef}>
        {/* Torso */}
        <mesh castShadow position={[0, 0.95, 0]}>
          <capsuleGeometry args={[0.35, 0.5, 6, 12]} />
          <meshToonMaterial color={bodyColor} gradientMap={gradientMap} />
        </mesh>

        {/* Shoulder yoke */}
        <mesh castShadow position={[0, 1.2, 0]}>
          <boxGeometry args={[0.85, 0.18, 0.5]} />
          <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
        </mesh>

        {/* Front wattle mark */}
        <mesh position={[0, 0.97, 0.36]}>
          <planeGeometry args={[0.28, 0.28]} />
          <meshBasicMaterial map={wattleTex} transparent depthWrite={false} />
        </mesh>

        {/* Back wattle mark */}
        <mesh position={[0, 0.97, -0.36]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.28, 0.28]} />
          <meshBasicMaterial map={wattleTex} transparent depthWrite={false} />
        </mesh>

        {/* Head group */}
        <group ref={headRef} position={[0, 1.45, 0]}>
          {/* Skull */}
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.42, 0.44]} />
            <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
          </mesh>
          {/* Visor */}
          <mesh position={[0, 0.02, 0.23]}>
            <boxGeometry args={[0.38, 0.18, 0.05]} />
            <meshToonMaterial
              ref={visorMatRef}
              color={visorColor}
              gradientMap={gradientMap}
              emissive={visorColor}
              emissiveIntensity={0.4}
            />
          </mesh>
          {/* Scan line strip below visor */}
          <mesh position={[0, -0.1, 0.23]}>
            <boxGeometry args={[0.34, 0.02, 0.03]} />
            <meshBasicMaterial color={visorColor} />
          </mesh>
          {/* Ear plates */}
          <mesh position={[-0.28, 0, 0]}>
            <boxGeometry args={[0.04, 0.2, 0.16]} />
            <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0.28, 0, 0]}>
            <boxGeometry args={[0.04, 0.2, 0.16]} />
            <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
          </mesh>
          {/* Antenna stalk */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.22, 6]} />
            <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
          </mesh>
          {/* Antenna tip */}
          <mesh ref={antennaTipRef} position={[0, 0.46, 0]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshToonMaterial
              ref={antennaMatRef}
              color="#ffa726"
              gradientMap={gradientMap}
              emissive="#ffa726"
              emissiveIntensity={0.6}
            />
          </mesh>
        </group>

        {/* Left arm */}
        <group ref={leftArmRef} position={[-0.45, 1.2, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
            <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, -0.42, 0]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
          </mesh>
        </group>

        {/* Right arm */}
        <group ref={rightArmRef} position={[0.45, 1.2, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
            <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, -0.42, 0]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
          </mesh>
        </group>
      </group>

      {/* Left leg */}
      <group ref={leftLegRef} position={[-0.16, 0.62, 0]}>
        <mesh castShadow position={[0, -0.28, 0]}>
          <capsuleGeometry args={[0.09, 0.36, 4, 8]} />
          <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, -0.52, 0.05]}>
          <boxGeometry args={[0.14, 0.08, 0.22]} />
          <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* Right leg */}
      <group ref={rightLegRef} position={[0.16, 0.62, 0]}>
        <mesh castShadow position={[0, -0.28, 0]}>
          <capsuleGeometry args={[0.09, 0.36, 4, 8]} />
          <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, -0.52, 0.05]}>
          <boxGeometry args={[0.14, 0.08, 0.22]} />
          <meshToonMaterial color={accentColor} gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* Blob shadow */}
      <mesh ref={blobRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          depthWrite={false}
          opacity={0.35}
        />
      </mesh>

      {/* Feet ground light */}
      <pointLight
        ref={feetLightRef}
        position={[0, 0.1, 0]}
        color={coreColor}
        intensity={0.12}
        distance={2.5}
      />

      {/* Antenna tip light */}
      <pointLight
        ref={antennaLightRef}
        position={[0, 1.91, 0]}
        color="#ffa726"
        intensity={0.3}
        distance={3}
      />

      {/* Collection burst sparks */}
      {sparks.map((s) => (
        <CollectionBurst key={s.id} spark={s} />
      ))}
    </group>
  );
}
