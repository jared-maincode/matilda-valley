import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { World } from "./components/World";
import { Player } from "./components/Player";
import { Avatar } from "./components/Avatar";
import { Footprints } from "./components/Footprints";
import { Core } from "./components/Core";
import { Waypoints } from "./components/Waypoints";
import { DataFragments, TOTAL_FRAGMENTS } from "./components/DataFragments";
import { RestorationEffects } from "./components/RestorationEffects";
import { PathBeacons } from "./components/PathBeacons";
import { Vegetation } from "./components/Vegetation";
import { SpawnPad } from "./components/SpawnPad";
const SignalAlign = lazy(() => import("./puzzles/SignalAlign").then((m) => ({ default: m.SignalAlign })));
const ResonanceBloom = lazy(() => import("./puzzles/ResonanceBloom").then((m) => ({ default: m.ResonanceBloom })));
const MemoryMatrix = lazy(() => import("./puzzles/MemoryMatrix").then((m) => ({ default: m.MemoryMatrix })));
import { useGame, FRAGMENTS_PER_SHARD, type ShardId } from "./store";
import { Audio } from "./lib/Audio";
import { playerTelemetry, PUZZLE_LIST, FRAGMENT_POSITIONS } from "./lib/playerState";
import { envState } from "./lib/environmentState";
import "./App.css";

function IntroOverlay() {
  const start = useGame((s) => s.start);
  const shards = useGame((s) => s.shards);
  const collectedFragmentIds = useGame((s) => s.collectedFragmentIds);
  const resetProgress = useGame((s) => s.resetProgress);
  const restoredCount = Object.values(shards).filter(Boolean).length;
  const hasProgress = restoredCount > 0 || collectedFragmentIds.length > 0;

  const handleStart = () => {
    Audio.init();
    start();
  };

  const handleReset = () => {
    resetProgress();
  };

  return (
    <div className="overlay intro-overlay">
      <div className="intro-content">
        <div className="intro-badge">MATILDA VALLEY</div>
        <h1 className="intro-title">
          The valley sleeps.<br />
          <span className="intro-accent">Reboot the signal.</span>
        </h1>
        <p className="intro-subtitle">
          A data blackout has silenced Matilda. Three memory shards lie scattered across the valley. Solve their puzzles to restore the core and bring her back online.
        </p>
        <div className="intro-shards">
          <div className={`shard-pip ${shards.signal ? "on" : ""}`}>
            <span className="pip-icon">{"\u25C8"}</span>
            <span className="pip-label">SIGNAL ALIGN</span>
          </div>
          <div className={`shard-pip ${shards.resonance ? "on" : ""}`}>
            <span className="pip-icon">{"\u266A"}</span>
            <span className="pip-label">RESONANCE BLOOM</span>
          </div>
          <div className={`shard-pip ${shards.memory ? "on" : ""}`}>
            <span className="pip-icon">{"\u27C1"}</span>
            <span className="pip-label">MEMORY MATRIX</span>
          </div>
        </div>
        <button id="enter-btn" className="enter-btn" onClick={handleStart}>
          {hasProgress ? "CONTINUE" : "ENTER THE VALLEY"}
        </button>
        {hasProgress && (
          <button className="reset-btn" onClick={handleReset}>RESET PROGRESS</button>
        )}
        <div className="intro-controls">
          <span><kbd>WASD</kbd> Move</span>
          <span><kbd>Shift</kbd> Sprint</span>
          <span><kbd>Space</kbd> Jump</span>
          <span><kbd>E</kbd> Interact</span>
          <span><kbd>Mouse</kbd> Look</span>
        </div>
      </div>
    </div>
  );
}

const FRAGMENT_OFFSETS: Record<string, number> = { signal: 0, resonance: 3, memory: 6 };

function Compass() {
  const shards = useGame((s) => s.shards);
  const fragmentsByShard = useGame((s) => s.fragmentsByShard);
  const markersRef = useRef<HTMLDivElement[]>([]);
  const fragMarkersRef = useRef<HTMLDivElement[]>([]);
  const northRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf: number;
    const radius = 38;
    const update = () => {
      const { x, z, heading } = playerTelemetry;
      if (northRef.current) {
        const nRel = Math.PI - heading;
        northRef.current.style.left = `${50 - Math.sin(nRel) * radius}%`;
        northRef.current.style.top = `${50 - Math.cos(nRel) * radius}%`;
        northRef.current.style.opacity = Math.cos(nRel) < -0.3 ? "0.3" : "1";
      }
      PUZZLE_LIST.forEach((p, i) => {
        const el = markersRef.current[i];
        if (!el) return;
        const dx = p.x - x;
        const dz = p.z - z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const worldAngle = Math.atan2(dx, dz);
        const relAngle = worldAngle - heading;
        const px = 50 - Math.sin(relAngle) * radius;
        const py = 50 - Math.cos(relAngle) * radius;
        el.style.left = `${px}%`;
        el.style.top = `${py}%`;
        el.style.opacity = dist < 12 ? "0" : "0.9";
      });
      FRAGMENT_POSITIONS.forEach((f, i) => {
        const el = fragMarkersRef.current[i];
        if (!el || !f.shard) return;
        const isCollected = i < (FRAGMENT_OFFSETS[f.shard] + fragmentsByShard[f.shard]);
        if (isCollected) {
          el.style.opacity = "0";
          return;
        }
        const dx = f.x - x;
        const dz = f.z - z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const worldAngle = Math.atan2(dx, dz);
        const relAngle = worldAngle - heading;
        const px = 50 - Math.sin(relAngle) * radius;
        const py = 50 - Math.cos(relAngle) * radius;
        el.style.left = `${px}%`;
        el.style.top = `${py}%`;
        el.style.opacity = dist < 10 ? "0" : "0.5";
      });
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [fragmentsByShard]);

  return (
    <div className="compass">
      <div className="compass-ring" />
      <div className="compass-n" ref={northRef}>N</div>
      {FRAGMENT_POSITIONS.map((f, i) => (
        <div
          key={`frag-${f.id}`}
          ref={(el) => { if (el) fragMarkersRef.current[i] = el; }}
          className="compass-marker fragment-marker"
        />
      ))}
      {PUZZLE_LIST.map((p, i) => (
        <div
          key={p.id}
          ref={(el) => { if (el) markersRef.current[i] = el; }}
          className={`compass-marker ${shards[p.id] ? "done" : ""}`}
        />
      ))}
    </div>
  );
}

function FragmentToast() {
  const fragmentLore = useGame((s) => s.fragmentLore);
  const clearFragmentLore = useGame((s) => s.clearFragmentLore);
  const fragmentsCollected = useGame((s) =>
    s.fragmentsByShard.signal + s.fragmentsByShard.resonance + s.fragmentsByShard.memory,
  );

  useEffect(() => {
    if (!fragmentLore) return;
    const timer = setTimeout(() => clearFragmentLore(), 5000);
    return () => clearTimeout(timer);
  }, [fragmentLore, clearFragmentLore]);

  if (!fragmentLore) return null;

  return (
    <div className="fragment-toast">
      <div className="fragment-toast-header">
        <span className="fragment-toast-icon">{"\u25C8"}</span>
        <span className="fragment-toast-title">DATA FRAGMENT RECOVERED</span>
        <span className="fragment-toast-count">{fragmentsCollected}/{TOTAL_FRAGMENTS}</span>
      </div>
      <p className="fragment-toast-lore">{fragmentLore}</p>
    </div>
  );
}

function ContextualHint() {
  const hintRef = useRef<HTMLSpanElement>(null);
  const shards = useGame((s) => s.shards);
  const fragmentsByShard = useGame((s) => s.fragmentsByShard);

  useEffect(() => {
    let raf: number;
    const update = () => {
      const { x, z } = playerTelemetry;
      const state = useGame.getState();
      let hint = "";

      let nearestPuzzle: { id: ShardId; dist: number } | null = null;
      for (const p of PUZZLE_LIST) {
        const dx = p.x - x;
        const dz = p.z - z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (!nearestPuzzle || dist < nearestPuzzle.dist) {
          nearestPuzzle = { id: p.id, dist };
        }
      }

      if (nearestPuzzle && nearestPuzzle.dist < 15) {
        const id = nearestPuzzle.id;
        if (state.shards[id]) {
          hint = `${id.toUpperCase()} shard restored. Find the next puzzle.`;
        } else if (state.fragmentsByShard[id] >= FRAGMENTS_PER_SHARD) {
          hint = `Press <kbd>E</kbd> to begin the ${id} puzzle.`;
        } else {
          const remaining = FRAGMENTS_PER_SHARD - state.fragmentsByShard[id];
          hint = `Collect ${remaining} more ${id} fragment${remaining > 1 ? "s" : ""} to unlock this puzzle.`;
        }
      } else {
        const restoredCount = Object.values(state.shards).filter(Boolean).length;
        const totalFragments = state.fragmentsByShard.signal + state.fragmentsByShard.resonance + state.fragmentsByShard.memory;
        if (restoredCount === 0 && totalFragments === 0) {
          hint = "Walk into data fragments to collect them. Press <kbd>E</kbd> near puzzles to interact.";
        } else if (restoredCount === 0) {
          hint = "Collect 3 fragments for a shard to unlock its puzzle.";
        } else if (restoredCount < 3) {
          hint = `${restoredCount}/3 shards restored. Find the next puzzle to reboot Matilda.`;
        }
      }

      if (hintRef.current && hintRef.current.innerHTML !== hint) {
        hintRef.current.innerHTML = hint;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [shards, fragmentsByShard]);

  return <span className="hud-hint" ref={hintRef} />;
}

function UnlockToast() {
  const fragmentsByShard = useGame((s) => s.fragmentsByShard);
  const shards = useGame((s) => s.shards);
  const prevCounts = useRef<Record<ShardId, number>>({ ...fragmentsByShard });
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const id of Object.keys(fragmentsByShard) as ShardId[]) {
      const prev = prevCounts.current[id] ?? 0;
      const now = fragmentsByShard[id];
      if (prev < FRAGMENTS_PER_SHARD && now >= FRAGMENTS_PER_SHARD && !shards[id]) {
        setUnlockMsg(`${id.toUpperCase()} PUZZLE UNLOCKED`);
        timers.push(setTimeout(() => setUnlockMsg(null), 4000));
      }
    }
    prevCounts.current = { ...fragmentsByShard };

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [fragmentsByShard, shards]);

  if (!unlockMsg) return null;

  return (
    <div className="unlock-toast">
      <span className="unlock-toast-icon">{"\u25B6"}</span>
      <span className="unlock-toast-text">{unlockMsg}</span>
    </div>
  );
}

function HUD() {
  const focus = useGame((s) => s.focus);
  const prompt = useGame((s) => s.prompt);
  const shards = useGame((s) => s.shards);
  const fragmentsCollected = useGame((s) =>
    s.fragmentsByShard.signal + s.fragmentsByShard.resonance + s.fragmentsByShard.memory,
  );
  const bonusFragments = useGame((s) => s.bonusFragments);
  const restoredCount = Object.values(shards).filter(Boolean).length;

  return (
    <div className="hud">
      <div className="hud-top-left">
        <div className="hud-shards">
          <span className={`hud-pip ${shards.signal ? "on" : ""}`} />
          <span className={`hud-pip ${shards.resonance ? "on" : ""}`} />
          <span className={`hud-pip ${shards.memory ? "on" : ""}`} />
          <span className="hud-count">{restoredCount}/3</span>
        </div>
        <div className="hud-fragments">
          <span className="hud-fragment-icon">{"\u25C8"}</span>
          <span className="hud-fragment-count">{fragmentsCollected}/{TOTAL_FRAGMENTS}</span>
        </div>
        {bonusFragments > 0 && (
          <div className="hud-fragments">
            <span className="hud-fragment-icon">{"\u2727"}</span>
            <span className="hud-fragment-count">{bonusFragments}/2</span>
          </div>
        )}
      </div>
      <div className="hud-top-right">
        <Compass />
      </div>
      <div className="hud-center">
        <div className="reticle" />
        {focus && prompt && <div className="prompt">{prompt}</div>}
      </div>
      <div className="hud-bottom">
        <ContextualHint />
      </div>
      <FragmentToast />
      <UnlockToast />
    </div>
  );
}

function WinOverlay() {
  const resetProgress = useGame((s) => s.resetProgress);
  return (
    <div className="overlay win-overlay">
      <div className="win-content">
        <div className="win-glow" />
        <h1 className="win-title">MATILDA ONLINE</h1>
        <p className="win-subtitle">All three memory shards restored. The core hums with life. The valley remembers.</p>
        <button className="enter-btn" onClick={resetProgress}>PLAY AGAIN</button>
        <p className="win-credit">Built with React Three Fiber and Matilda Desktop.</p>
      </div>
    </div>
  );
}

const underwaterFogColor = new THREE.Color("#1a5a6a");
const underwaterBgColor = new THREE.Color("#0d3a48");

function PauseOverlay() {
  const resume = useGame((s) => s.resume);
  const quitToTitle = useGame((s) => s.quitToTitle);
  const restart = useGame((s) => s.restart);

  return (
    <div className="overlay pause-overlay">
      <div className="pause-content">
        <h1 className="pause-title">PAUSED</h1>
        <div className="pause-buttons">
          <button className="pause-btn primary" onClick={resume}>RESUME</button>
          <button className="pause-btn" onClick={restart}>RESTART</button>
          <button className="pause-btn" onClick={quitToTitle}>QUIT TO TITLE</button>
        </div>
        <div className="pause-controls">
          <span><kbd>WASD</kbd> Move</span>
          <span><kbd>Shift</kbd> Sprint</span>
          <span><kbd>Space</kbd> Jump</span>
          <span><kbd>E</kbd> Interact</span>
          <span><kbd>ESC</kbd> Pause</span>
        </div>
      </div>
    </div>
  );
}

function UnderwaterFX() {
  const { scene } = useThree();

  useFrame(() => {
    if (!scene.fog || !(scene.fog instanceof THREE.Fog)) return;
    const fog = scene.fog as THREE.Fog;
    const target = playerTelemetry.isUnderwater;
    const lerpSpeed = 0.06;
    if (target) {
      fog.color.lerp(underwaterFogColor, lerpSpeed);
      fog.near += (2 - fog.near) * lerpSpeed;
      fog.far += (40 - fog.far) * lerpSpeed;
      if (scene.background instanceof THREE.Color) {
        scene.background.lerp(underwaterBgColor, lerpSpeed);
      }
    } else {
      fog.color.lerp(envState.fogColor, lerpSpeed);
      fog.near += (50 - fog.near) * lerpSpeed;
      fog.far += (160 - fog.far) * lerpSpeed;
      if (scene.background instanceof THREE.Color) {
        scene.background.lerp(envState.bgColor, lerpSpeed);
      }
    }
  });

  return null;
}

function Scene() {
  const phase = useGame((s) => s.phase);
  const resetNonce = useGame((s) => s.resetNonce);
  return (
    <>
      <World />
      <Core />
      <Waypoints />
      <PathBeacons />
      <Vegetation />
      <SpawnPad />
      <DataFragments key={`frag-${resetNonce}`} />
      <RestorationEffects />
      <SignalAlign key={`sig-${resetNonce}`} />
      <ResonanceBloom key={`res-${resetNonce}`} />
      <MemoryMatrix key={`mem-${resetNonce}`} />
      <Player />
      <Avatar />
      <Footprints />
      <UnderwaterFX />
      {(phase === "playing" || phase === "paused") && (
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            radius={0.7}
          />
          <Vignette eskil={false} offset={0.3} darkness={0.8} />
        </EffectComposer>
      )}
    </>
  );
}

export default function App() {
  const phase = useGame((s) => s.phase);
  const underwaterOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onContext = (e: Event) => e.preventDefault();
    window.addEventListener("contextmenu", onContext);
    return () => window.removeEventListener("contextmenu", onContext);
  }, []);

  useEffect(() => {
    if (phase === "paused") {
      Audio.suspend();
    } else if (phase === "playing") {
      Audio.resume();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing" && phase !== "paused") return;
    let raf: number;
    const update = () => {
      if (underwaterOverlayRef.current) {
        const target = playerTelemetry.isUnderwater ? 0.35 : 0;
        const current = parseFloat(underwaterOverlayRef.current.style.opacity || "0");
        const next = current + (target - current) * 0.08;
        underwaterOverlayRef.current.style.opacity = String(next);
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <div className="game-root">
      <div className="underwater-overlay" ref={underwaterOverlayRef} />
      <Canvas
        shadows
        camera={{ fov: 70, near: 0.1, far: 500, position: [0, 5, 55] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      {phase === "intro" && <IntroOverlay />}
      {phase === "playing" && <HUD />}
      {phase === "paused" && <PauseOverlay />}
      {phase === "won" && <WinOverlay />}
    </div>
  );
}
