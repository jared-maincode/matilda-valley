import { describe, it, expect, afterEach } from "vitest";
import * as THREE from "three";
import { registerInteractable, getInteractables, castInteraction, type Interactable } from "./interaction";

function makeInteractable(id: string, x: number, z: number, prompt = ""): Interactable {
  const obj = new THREE.Object3D();
  obj.position.set(x, 0, z);
  return { id, object: obj, prompt };
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
});

describe("registerInteractable", () => {
  it("adds entry to the interactables list", () => {
    const unreg = registerInteractable(makeInteractable("test-add", 0, 0));
    cleanups.push(unreg);
    const list = getInteractables();
    expect(list.some((i) => i.id === "test-add")).toBe(true);
  });

  it("returns a cleanup function that removes the entry", () => {
    const unreg = registerInteractable(makeInteractable("test-remove", 0, 0));
    expect(getInteractables().some((i) => i.id === "test-remove")).toBe(true);
    unreg();
    expect(getInteractables().some((i) => i.id === "test-remove")).toBe(false);
  });

  it("supports multiple simultaneous registrations", () => {
    const u1 = registerInteractable(makeInteractable("multi-1", 0, 0));
    const u2 = registerInteractable(makeInteractable("multi-2", 10, 0));
    cleanups.push(u1, u2);
    const list = getInteractables();
    expect(list.some((i) => i.id === "multi-1")).toBe(true);
    expect(list.some((i) => i.id === "multi-2")).toBe(true);
  });
});

describe("castInteraction proximity fallback", () => {
  it("returns null when no interactables are registered", () => {
    const origin = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, -1);
    const camera = new THREE.Camera();
    const result = castInteraction(camera, 6, origin, dir);
    expect(result).toBeNull();
  });

  it("returns the closest interactable in front of the player", () => {
    const u1 = registerInteractable(makeInteractable("near", 0, -3));
    const u2 = registerInteractable(makeInteractable("far", 0, -6));
    cleanups.push(u1, u2);

    const origin = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, -1);
    const camera = new THREE.Camera();
    const result = castInteraction(camera, 10, origin, dir);
    expect(result?.id).toBe("near");
  });

  it("returns null when all interactables are beyond range", () => {
    const u = registerInteractable(makeInteractable("distant", 0, -50));
    cleanups.push(u);

    const origin = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, -1);
    const camera = new THREE.Camera();
    const result = castInteraction(camera, 6, origin, dir);
    expect(result).toBeNull();
  });

  it("returns null when interactables are behind the player", () => {
    const u = registerInteractable(makeInteractable("behind", 0, 5));
    cleanups.push(u);

    const origin = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, -1);
    const camera = new THREE.Camera();
    const result = castInteraction(camera, 20, origin, dir);
    expect(result).toBeNull();
  });

  it("returns null when interactables are to the side (facing < 0.2)", () => {
    const u = registerInteractable(makeInteractable("side", 5, 0));
    cleanups.push(u);

    const origin = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, -1);
    const camera = new THREE.Camera();
    const result = castInteraction(camera, 20, origin, dir);
    expect(result).toBeNull();
  });

  it("picks the closest of multiple in-range interactables", () => {
    const u1 = registerInteractable(makeInteractable("a", 1, -4));
    const u2 = registerInteractable(makeInteractable("b", 0, -3));
    const u3 = registerInteractable(makeInteractable("c", -1, -5));
    cleanups.push(u1, u2, u3);

    const origin = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, -1);
    const camera = new THREE.Camera();
    const result = castInteraction(camera, 10, origin, dir);
    expect(result?.id).toBe("b");
  });

  it("uses proximity radius of range + 2", () => {
    const u = registerInteractable(makeInteractable("edge", 0, -7.5));
    cleanups.push(u);

    const origin = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, -1);
    const camera = new THREE.Camera();
    const result = castInteraction(camera, 6, origin, dir);
    expect(result?.id).toBe("edge");
  });

  it("excludes interactables just outside proximity radius", () => {
    const u = registerInteractable(makeInteractable("too-far", 0, -8.5));
    cleanups.push(u);

    const origin = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, -1);
    const camera = new THREE.Camera();
    const result = castInteraction(camera, 6, origin, dir);
    expect(result).toBeNull();
  });
});
