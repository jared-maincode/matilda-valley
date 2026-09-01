import * as THREE from "three";

export interface Interactable {
  id: string;
  object: THREE.Object3D;
  prompt: string;
}

const interactables: Interactable[] = [];
let _cachedObjects: THREE.Object3D[] | null = null;

export function registerInteractable(entry: Interactable) {
  interactables.push(entry);
  _cachedObjects = null;
  return () => {
    const idx = interactables.indexOf(entry);
    if (idx >= 0) interactables.splice(idx, 1);
    _cachedObjects = null;
  };
}

export function getInteractables(): Interactable[] {
  return interactables;
}

const _raycaster = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _objPos = new THREE.Vector3();
const _toObj = new THREE.Vector3();

export function castInteraction(
  camera: THREE.Camera,
  range: number,
  origin?: THREE.Vector3,
  direction?: THREE.Vector3,
): Interactable | null {
  if (origin) {
    _origin.copy(origin);
  } else {
    camera.getWorldPosition(_origin);
  }
  if (direction) {
    _dir.copy(direction);
  } else {
    camera.getWorldDirection(_dir);
  }
  _raycaster.set(_origin, _dir);
  _raycaster.far = range;

  const objs = _cachedObjects ??= interactables.map((i) => i.object);
  const hits = _raycaster.intersectObjects(objs, true);
  if (hits.length > 0) {
    const hit = hits[0];
    let target: THREE.Object3D | null = hit.object;
    while (target) {
      const found = interactables.find((i) => i.object === target);
      if (found) return found;
      target = target.parent;
    }
  }

  // Proximity fallback: return closest interactable that the player is facing
  const proximityRadius = range + 2;
  let closest: Interactable | null = null;
  let closestDist = Infinity;
  for (const inter of interactables) {
    inter.object.getWorldPosition(_objPos);
    _toObj.subVectors(_objPos, _origin);
    const dist = _toObj.length();
    if (dist > proximityRadius) continue;
    // Only consider interactables roughly in front of the player
    _toObj.normalize();
    const facing = _toObj.dot(_dir);
    if (facing < 0.2) continue;
    if (dist < closestDist) {
      closestDist = dist;
      closest = inter;
    }
  }
  return closest;
}
