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
  SEQUENCE_LENGTH,
  generateSequence,
  checkInput,
  type MemoryPhase,
} from "./memoryMatrixLogic";

const GRID = 3;
const SPACING = 2.2;
const PX = PUZZLE_POSITIONS.memory;

const _identityScale = new THREE.Vector3(1, 1, 1);

function glyphPositions(): [number, number, number][] {
  const pos: [number, number, number][] = [];
  const offset = ((GRID - 1) * SPACING) / 2;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const x = PX[0] - offset + c * SPACING;
      const z = PX[2] - offset + r * SPACING;
      pos.push([x, terrainHeight(x, z), z]);
    }
  }
  return pos;
}

function GlyphPillar({
  position,
  index,
  state,
  onInteract,
  disabled,
  locked,
}: {
  position: [number, number, number];
  index: number;
  state: "dim" | "lit" | "correct" | "wrong";
  onInteract: (i: number) => void;
  disabled: boolean;
  locked: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const glyphRef = useRef<THREE.Mesh>(null);
  const gradientMap = useMemo(() => getToonGradient(), []);

  useEffect(() => {
    const obj = ref.current;
    if (!obj) return;
    return registerInteractable({
      id: `memory:glyph-${index}`,
      object: obj,
      prompt: locked
        ? `Locked: collect ${FRAGMENTS_PER_SHARD} memory fragments`
        : disabled ? "" : `[E] Activate glyph ${index + 1}`,
    });
  }, [index, disabled, locked]);

  useEffect(() => {
    if (locked || disabled) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string };
      if (detail.id === `memory:glyph-${index}`) {
        onInteract(index);
      }
    };
    window.addEventListener("interact", handler);
    return () => window.removeEventListener("interact", handler);
  }, [index, onInteract, disabled, locked]);

  useFrame(({ clock }) => {
    if (!glyphRef.current) return;
    if (state === "lit") {
      glyphRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 15) * 0.1);
    } else if (state === "correct") {
      glyphRef.current.scale.setScalar(1.2);
    } else if (state === "wrong") {
      glyphRef.current.scale.setScalar(0.9);
    } else {
      glyphRef.current.scale.lerp(_identityScale, 0.15);
    }
  });

  const color =
    state === "lit" ? COLORS.amber
    : state === "correct" ? COLORS.shardRestored
    : state === "wrong" ? "#ef4444"
    : "#4a5a6a";
  const emissive = color;
  const intensity = state === "dim" ? 0.1 : state === "lit" ? 0.8 : 0.6;

  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[0.8, 1.5, 0.8]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      <mesh ref={glyphRef} position={[0, 1.8, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshToonMaterial
          color={color}
          gradientMap={gradientMap}
          emissive={emissive}
          emissiveIntensity={intensity}
          transparent
          opacity={state === "dim" ? 0.5 : 1}
        />
      </mesh>
      {(state === "lit" || state === "correct") && (
        <pointLight position={[0, 1.8, 0]} intensity={1.5} color={color} distance={4} />
      )}
    </group>
  );
}

function MemoryAltar({
  onStart,
  phase,
  restored,
  locked,
}: {
  onStart: () => void;
  phase: MemoryPhase;
  restored: boolean;
  locked: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const altarZ = PX[2] - (GRID * SPACING) / 2 - 3;
  const baseY = terrainHeight(PX[0], altarZ);
  const gradientMap = useMemo(() => getToonGradient(), []);

  useEffect(() => {
    const obj = ref.current;
    if (!obj) return;
    return registerInteractable({
      id: "memory:altar",
      object: obj,
      prompt: restored ? "" : locked
        ? `Locked: collect ${FRAGMENTS_PER_SHARD} memory fragments`
        : phase === "idle" ? "[E] Reveal memory" : "[E] Restart",
    });
  }, [phase, restored, locked]);

  useEffect(() => {
    if (locked || restored) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string };
      if (detail.id === "memory:altar") {
        onStart();
      }
    };
    window.addEventListener("interact", handler);
    return () => window.removeEventListener("interact", handler);
  }, [onStart, restored, locked]);

  useFrame(({ clock }) => {
    if (!coreRef.current) return;
    coreRef.current.rotation.y = clock.elapsedTime * 0.4;
    coreRef.current.rotation.x = clock.elapsedTime * 0.2;
  });

  const altarColor = restored ? COLORS.shardRestored : locked ? "#ef4444" : phase === "showing" ? COLORS.amber : COLORS.magenta;

  return (
    <group ref={ref} position={[PX[0], baseY, altarZ]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1, 1.3, 0.3, 12]} />
        <meshToonMaterial color={COLORS.stone} gradientMap={gradientMap} />
      </mesh>
      <mesh ref={coreRef} position={[0, 1.1, 0]}>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshToonMaterial
          color={altarColor}
          gradientMap={gradientMap}
          emissive={altarColor}
          emissiveIntensity={0.6}
        />
      </mesh>
      <pointLight position={[0, 1.1, 0]} intensity={2} color={altarColor} distance={8} />
    </group>
  );
}

export function MemoryMatrix() {
  const restored = useGame((s) => s.shards.memory);
  const fragmentCount = useGame((s) => s.fragmentsByShard.memory);
  const restoreShard = useGame((s) => s.restoreShard);
  const locked = !restored && fragmentCount < FRAGMENTS_PER_SHARD;
  const [phase, setPhase] = useState<MemoryPhase>("idle");
  const [sequence] = useState<number[]>(() => generateSequence());
  const [litGlyph, setLitGlyph] = useState(-1);
  const [glyphStates, setGlyphStates] = useState<Record<number, "dim" | "lit" | "correct" | "wrong">>({});
  const [inputPos, setInputPos] = useState(0);
  const positions = glyphPositions();

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (wrongTimer.current) {
      clearTimeout(wrongTimer.current);
      wrongTimer.current = null;
    }
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (!restored) {
      clearTimers();
      setPhase("idle");
      setGlyphStates({});
      setInputPos(0);
      setLitGlyph(-1);
    }
  }, [restored]);

  const startSequence = () => {
    clearTimers();
    setGlyphStates({});
    setInputPos(0);
    setPhase("showing");

    let step = 0;
    const showNext = () => {
      if (step >= sequence.length) {
        showTimer.current = setTimeout(() => {
          setLitGlyph(-1);
          setPhase("input");
        }, 400);
        return;
      }
      const gi = sequence[step];
      setLitGlyph(gi);
      Audio.glyphTone(step);
      showTimer.current = setTimeout(() => {
        setLitGlyph(-1);
        showTimer.current = setTimeout(() => {
          step++;
          showNext();
        }, 200);
      }, 600);
    };
    showNext();
  };

  const handleGlyphActivate = (index: number) => {
    if (locked || phase !== "input") return;
    Audio.glyphTone(inputPos);

    const result = checkInput(sequence, inputPos, index);
    if (result.correct) {
      setGlyphStates((prev) => ({ ...prev, [index]: "correct" }));
      setInputPos(result.nextPos);
      if (result.complete) {
        setPhase("done");
        clearTimers();
        Audio.shardRestored();
        restoreShard("memory");
      }
    } else {
      setGlyphStates((prev) => {
        const wrong: Record<number, "wrong"> = {};
        wrong[index] = "wrong";
        return { ...prev, ...wrong };
      });
      Audio.wrong();
      wrongTimer.current = setTimeout(() => {
        setGlyphStates({});
        setPhase("idle");
        setInputPos(0);
      }, 800);
    }
  };

  const handleStart = () => {
    if (locked || restored) return;
    if (phase === "idle") {
      startSequence();
    } else if (phase === "input") {
      setGlyphStates({});
      setInputPos(0);
      startSequence();
    }
  };

  const getGlyphState = (i: number): "dim" | "lit" | "correct" | "wrong" => {
    if (glyphStates[i]) return glyphStates[i];
    if (litGlyph === i) return "lit";
    return "dim";
  };

  return (
    <group>
      <MemoryAltar onStart={handleStart} phase={phase} restored={restored} locked={locked} />

      {positions.map((pos, i) => (
        <GlyphPillar
          key={i}
          position={pos}
          index={i}
          state={getGlyphState(i)}
          onInteract={handleGlyphActivate}
          disabled={phase !== "input" || restored}
          locked={locked}
        />
      ))}

      {locked && <LockDome position={[PX[0], terrainHeight(PX[0], PX[2]), PX[2]]} />}

      {restored && (
        <RestoredVisuals position={[PX[0], terrainHeight(PX[0], PX[2]), PX[2]]} yOffset={4} />
      )}

      <Billboard position={[PX[0], terrainHeight(PX[0], PX[2]) + 7, PX[2]]}>
        <Text
          fontSize={0.5}
          color={restored ? COLORS.shardRestored : locked ? "#ef4444" : COLORS.magenta}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {restored ? "MEMORY RESTORED" : locked ? "MEMORY LOCKED" : "MEMORY MATRIX"}
        </Text>
      </Billboard>

      {phase === "input" && !restored && (
        <Billboard position={[PX[0], terrainHeight(PX[0], PX[2]) + 5.5, PX[2]]}>
          <Text
            fontSize={0.3}
            color={COLORS.cyan}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000"
          >
            {`RECALL THE SEQUENCE  ${inputPos}/${SEQUENCE_LENGTH}`}
          </Text>
        </Billboard>
      )}

      {phase === "showing" && !restored && (
        <Billboard position={[PX[0], terrainHeight(PX[0], PX[2]) + 5.5, PX[2]]}>
          <Text
            fontSize={0.3}
            color={COLORS.amber}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000"
          >
            WATCH THE GLYPHS...
          </Text>
        </Billboard>
      )}
    </group>
  );
}
