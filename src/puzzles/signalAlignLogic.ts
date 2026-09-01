import * as THREE from "three";
import { terrainHeight } from "../lib/terrain";
import { PUZZLE_POSITIONS } from "../constants";

export const MIRROR_ANGLES = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];

export interface Mirror { pos: [number, number, number]; angleIndex: number; }

const PX = PUZZLE_POSITIONS.signal;
const SOURCE_POS: [number, number, number] = [PX[0] - 7, 0, PX[2] - 5];
const RECEIVER_POS: [number, number, number] = [PX[0] + 7, 0, PX[2] + 5];

export const MIRRORS: Mirror[] = [
  { pos: [PX[0] - 3, 0, PX[2] + 1], angleIndex: 1 },
  { pos: [PX[0] + 1, 0, PX[2] - 3], angleIndex: 5 },
  { pos: [PX[0] + 5, 0, PX[2] + 3], angleIndex: 3 },
];

export function computeBeamPath(mirrors: Mirror[]): THREE.Vector3[] {
  const source = new THREE.Vector3(SOURCE_POS[0], terrainHeight(SOURCE_POS[0], SOURCE_POS[2]) + 3, SOURCE_POS[2]);
  const receiver = new THREE.Vector3(RECEIVER_POS[0], terrainHeight(RECEIVER_POS[0], RECEIVER_POS[2]) + 3, RECEIVER_POS[2]);
  const points: THREE.Vector3[] = [source.clone()];
  let current = source.clone();
  for (let i = 0; i < mirrors.length; i++) {
    const mirror = mirrors[i];
    const mirrorPos = new THREE.Vector3(mirror.pos[0], terrainHeight(mirror.pos[0], mirror.pos[2]) + 2.5, mirror.pos[2]);
    const angle = MIRROR_ANGLES[mirror.angleIndex];
    const mirrorNormal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));

    const toMirror = mirrorPos.clone().sub(current);
    toMirror.y = 0;
    toMirror.normalize();

    const dot = toMirror.dot(mirrorNormal);
    const reflected = toMirror.clone().sub(mirrorNormal.clone().multiplyScalar(2 * dot)).normalize();

    const nextTarget = i + 1 < mirrors.length
      ? new THREE.Vector3(mirrors[i + 1].pos[0], terrainHeight(mirrors[i + 1].pos[0], mirrors[i + 1].pos[2]) + 2.5, mirrors[i + 1].pos[2])
      : receiver;
    const toNext = nextTarget.clone().sub(mirrorPos);
    toNext.y = 0;
    toNext.normalize();

    const alignment = reflected.dot(toNext);
    points.push(mirrorPos.clone());
    current = mirrorPos.clone();
    if (alignment < 0.92) return points;
  }
  points.push(receiver.clone());
  return points;
}

export function alignedCount(path: THREE.Vector3[]): number {
  return Math.max(0, path.length - 2);
}
