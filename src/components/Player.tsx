import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { useGame } from "../store";
import { Audio } from "../lib/Audio";
import { castInteraction } from "../lib/interaction";
import { resolveCollision } from "../lib/collision";
import {
  EYE_HEIGHT,
  WALK_SPEED,
  SPRINT_SPEED,
  JUMP_SPEED,
  GRAVITY,
  INTERACT_RANGE,
  WORLD_HALF,
  WATER_LEVEL,
  SWIM_SPEED,
  WATER_GRAVITY,
  MOUSE_SENSITIVITY,
  SPAWN_POSITION,
  PAD_RADIUS,
  PAD_HEIGHT,
} from "../constants";
import { terrainHeight } from "../lib/terrain";
import { playerTelemetry } from "../lib/playerState";
import { avatarState } from "../lib/avatarState";
import { addFootprint } from "../lib/footprints";
import { ThirdPersonCamera } from "../lib/camera";

const keys: Record<string, boolean> = {};

export function Player() {
  const { camera, gl } = useThree();

  const velocityY = useRef(0);
  const onGround = useRef(true);
  const padGroundY = useMemo(
    () => terrainHeight(SPAWN_POSITION.x, SPAWN_POSITION.z) + PAD_HEIGHT + EYE_HEIGHT,
    [],
  );
  const pos = useRef(new THREE.Vector3(SPAWN_POSITION.x, padGroundY + 1, SPAWN_POSITION.z));
  const stepTimer = useRef(0);
  const footSide = useRef(0);

  const cam = useMemo(() => new ThirdPersonCamera(0, -0.1), []);

  const phase = useGame((s) => s.phase);
  const setFocus = useGame((s) => s.setFocus);
  const resetNonce = useGame((s) => s.resetNonce);

  useEffect(() => {
    if (resetNonce > 0) {
      pos.current.set(SPAWN_POSITION.x, padGroundY + 1, SPAWN_POSITION.z);
      velocityY.current = 0;
      onGround.current = true;
      stepTimer.current = 0;
      cam.yaw = 0;
      cam.pitch = -0.1;
    }
  }, [resetNonce, cam, padGroundY]);

  const forwardVec = useRef(new THREE.Vector3());
  const rightVec = useRef(new THREE.Vector3());
  const dirVec = useRef(new THREE.Vector3());
  const interactOrigin = useRef(new THREE.Vector3());
  const interactDir = useRef(new THREE.Vector3());

  useEffect(() => {
    const canvas = gl.domElement;

    const requestLock = () => {
      if (useGame.getState().phase === "playing" && !document.pointerLockElement) {
        canvas.requestPointerLock();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      if (useGame.getState().phase !== "playing") return;
      cam.addMouseDelta(e.movementX, e.movementY, MOUSE_SENSITIVITY);
    };

    const onPointerLockChange = () => {
      if (!document.pointerLockElement && useGame.getState().phase === "playing") {
        useGame.getState().pause();
      }
    };

    canvas.addEventListener("click", requestLock);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);

    return () => {
      canvas.removeEventListener("click", requestLock);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    };
  }, [cam, gl]);

  useEffect(() => {
    if (phase === "playing" && !document.pointerLockElement) {
      gl.domElement.requestPointerLock();
    } else if (phase !== "playing" && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [phase, gl]);

  const tryInteractRef = useRef<() => void>(() => {});

  tryInteractRef.current = () => {
    if (useGame.getState().phase !== "playing") return;
    interactOrigin.current.set(pos.current.x, pos.current.y + 0.5, pos.current.z);
    cam.getLookDirection(interactDir.current);
    const hit = castInteraction(camera, INTERACT_RANGE, interactOrigin.current, interactDir.current);
    if (!hit) return;
    Audio.interact();
    window.dispatchEvent(
      new CustomEvent("interact", { detail: { id: hit.id } }),
    );
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === "KeyE") {
        tryInteractRef.current();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const onClick = () => {
      if (useGame.getState().phase === "playing") {
        tryInteractRef.current();
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  useFrame((_, delta) => {
    if (phase !== "playing") {
      if (phase === "intro") {
        const t = performance.now() * 0.0002;
        camera.position.set(
          Math.cos(t) * 45,
          20 + Math.sin(t * 0.7) * 3,
          Math.sin(t) * 45,
        );
        camera.lookAt(0, 4, 0);
      }
      return;
    }

    const dt = Math.min(delta, 0.05);

    cam.getForward(forwardVec.current);
    cam.getRight(rightVec.current);

    let moveX = 0;
    let moveZ = 0;
    if (keys["KeyW"] || keys["ArrowUp"]) moveZ += 1;
    if (keys["KeyS"] || keys["ArrowDown"]) moveZ -= 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) moveX -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) moveX += 1;

    const sprint = keys["ShiftLeft"] || keys["ShiftRight"];

    const terrainH = terrainHeight(pos.current.x, pos.current.z);
    const waterSurfaceY = WATER_LEVEL + EYE_HEIGHT;
    const inWater = terrainH < WATER_LEVEL && pos.current.y < waterSurfaceY;
    playerTelemetry.isInWater = inWater;

    const speed = inWater ? SWIM_SPEED : (sprint ? SPRINT_SPEED : WALK_SPEED);
    const gravity = inWater ? WATER_GRAVITY : GRAVITY;

    dirVec.current.set(0, 0, 0);
    dirVec.current.addScaledVector(forwardVec.current, moveZ);
    dirVec.current.addScaledVector(rightVec.current, moveX);
    if (dirVec.current.lengthSq() > 0) dirVec.current.normalize();

    let newX = pos.current.x + dirVec.current.x * speed * dt;
    let newZ = pos.current.z + dirVec.current.z * speed * dt;

    const [collidedX, collidedZ] = resolveCollision(newX, newZ, pos.current.y);
    newX = collidedX;
    newZ = collidedZ;

    pos.current.x = THREE.MathUtils.clamp(newX, -WORLD_HALF + 2, WORLD_HALF - 2);
    pos.current.z = THREE.MathUtils.clamp(newZ, -WORLD_HALF + 2, WORLD_HALF - 2);

    if (inWater) {
      if (keys["Space"]) {
        velocityY.current += 12 * dt;
      }
      velocityY.current -= gravity * dt;
      velocityY.current = THREE.MathUtils.clamp(velocityY.current, -3, 4);
    } else {
      if (keys["Space"] && onGround.current) {
        velocityY.current = JUMP_SPEED;
        onGround.current = false;
      }
      velocityY.current -= gravity * dt;
    }

    let groundY = terrainHeight(pos.current.x, pos.current.z) + EYE_HEIGHT;
    const padDx = pos.current.x - SPAWN_POSITION.x;
    const padDz = pos.current.z - SPAWN_POSITION.z;
    if (Math.sqrt(padDx * padDx + padDz * padDz) < PAD_RADIUS) {
      groundY = Math.max(groundY, padGroundY);
    }
    pos.current.y += velocityY.current * dt;
    if (pos.current.y <= groundY) {
      pos.current.y = groundY;
      velocityY.current = 0;
      onGround.current = true;
    }

    cam.update(camera, pos.current.x, pos.current.y, pos.current.z, dt);

    playerTelemetry.x = pos.current.x;
    playerTelemetry.y = pos.current.y;
    playerTelemetry.z = pos.current.z;
    playerTelemetry.velocityY = velocityY.current;
    playerTelemetry.isGrounded = onGround.current;
    playerTelemetry.heading =
      dirVec.current.lengthSq() > 0
        ? Math.atan2(dirVec.current.x, dirVec.current.z)
        : Math.atan2(forwardVec.current.x, forwardVec.current.z);

    const camY = camera.position.y;
    if (playerTelemetry.isUnderwater) {
      playerTelemetry.isUnderwater = camY < WATER_LEVEL + 0.15;
    } else {
      playerTelemetry.isUnderwater = camY < WATER_LEVEL - 0.15;
    }

    avatarState.moveSpeed = dirVec.current.lengthSq() > 0 ? speed : 0;
    avatarState.isSprinting = sprint;
    avatarState.isGrounded = onGround.current;
    avatarState.isInWater = inWater;

    if (dirVec.current.lengthSq() > 0) {
      stepTimer.current += dt;
      const moving = inWater ? true : onGround.current;
      if (moving) {
        const interval = inWater ? 0.6 : (sprint ? 0.28 : 0.42);
        if (stepTimer.current >= interval) {
          stepTimer.current = 0;
          if (inWater) {
            Audio.wade();
          } else {
            const surface = terrainH < 0 ? "sand" : terrainH < 6 ? "grass" : "rock";
            Audio.step(surface);
            const stepHeading = dirVec.current.lengthSq() > 0
              ? Math.atan2(dirVec.current.x, dirVec.current.z)
              : playerTelemetry.heading;
            footSide.current = -footSide.current;
            addFootprint(
              pos.current.x,
              pos.current.z,
              terrainHeight(pos.current.x, pos.current.z) + 0.02,
              stepHeading,
              footSide.current,
            );
          }
        }
      }
    }

    interactOrigin.current.set(pos.current.x, pos.current.y + 0.5, pos.current.z);
    cam.getLookDirection(interactDir.current);
    const hit = castInteraction(camera, INTERACT_RANGE, interactOrigin.current, interactDir.current);
    const state = useGame.getState();
    if (hit) {
      if (state.focus !== hit.id || state.prompt !== hit.prompt) {
        setFocus(hit.id, hit.prompt);
      }
    } else {
      if (state.focus !== null) {
        setFocus(null, "");
      }
    }
  });

  return null;
}
