import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { ThirdPersonCamera } from "./camera";

describe("ThirdPersonCamera", () => {
  it("initialises with default yaw and pitch", () => {
    const cam = new ThirdPersonCamera();
    expect(cam.yaw).toBe(0);
    expect(cam.pitch).toBe(-0.1);
  });

  it("initialises with custom yaw and pitch", () => {
    const cam = new ThirdPersonCamera(1.5, 0.2);
    expect(cam.yaw).toBe(1.5);
    expect(cam.pitch).toBe(0.2);
  });

  describe("addMouseDelta", () => {
    it("updates yaw based on horizontal delta", () => {
      const cam = new ThirdPersonCamera(0, 0);
      cam.addMouseDelta(100, 0, 0.002);
      expect(cam.yaw).toBeCloseTo(-0.2, 5);
    });

    it("updates pitch based on vertical delta", () => {
      const cam = new ThirdPersonCamera(0, 0);
      cam.addMouseDelta(0, 50, 0.002);
      expect(cam.pitch).toBeCloseTo(-0.1, 5);
    });

    it("clamps pitch to upper bound", () => {
      const cam = new ThirdPersonCamera(0, 0);
      cam.addMouseDelta(0, 10000, 1);
      expect(cam.pitch).toBeLessThanOrEqual(0.35);
    });

    it("clamps pitch to lower bound", () => {
      const cam = new ThirdPersonCamera(0, 0);
      cam.addMouseDelta(0, -10000, 1);
      expect(cam.pitch).toBeGreaterThanOrEqual(-0.85);
    });
  });

  describe("getForward", () => {
    it("returns forward vector for yaw=0 facing -z", () => {
      const cam = new ThirdPersonCamera(0, 0);
      const out = new THREE.Vector3();
      cam.getForward(out);
      expect(out.x).toBeCloseTo(0, 5);
      expect(out.y).toBeCloseTo(0, 5);
      expect(out.z).toBeCloseTo(-1, 5);
    });

    it("returns forward vector for yaw=pi/2 facing -x", () => {
      const cam = new ThirdPersonCamera(Math.PI / 2, 0);
      const out = new THREE.Vector3();
      cam.getForward(out);
      expect(out.x).toBeCloseTo(-1, 5);
      expect(out.z).toBeCloseTo(0, 5);
    });

    it("returns a normalised vector", () => {
      const cam = new ThirdPersonCamera(0.7, 0);
      const out = new THREE.Vector3();
      cam.getForward(out);
      expect(out.length()).toBeCloseTo(1, 5);
    });
  });

  describe("getRight", () => {
    it("returns right vector for yaw=0 facing +x", () => {
      const cam = new ThirdPersonCamera(0, 0);
      const out = new THREE.Vector3();
      cam.getRight(out);
      expect(out.x).toBeCloseTo(1, 5);
      expect(out.z).toBeCloseTo(0, 5);
    });

    it("is perpendicular to forward", () => {
      const cam = new ThirdPersonCamera(1.3, 0);
      const fwd = new THREE.Vector3();
      const right = new THREE.Vector3();
      cam.getForward(fwd);
      cam.getRight(right);
      expect(fwd.dot(right)).toBeCloseTo(0, 5);
    });
  });

  describe("getLookDirection", () => {
    it("includes pitch in the look direction", () => {
      const cam = new ThirdPersonCamera(0, 0.5);
      const out = new THREE.Vector3();
      cam.getLookDirection(out);
      expect(out.y).toBeGreaterThan(0);
    });

    it("is normalised", () => {
      const cam = new ThirdPersonCamera(0.8, -0.3);
      const out = new THREE.Vector3();
      cam.getLookDirection(out);
      expect(out.length()).toBeCloseTo(1, 5);
    });

    it("looks straight ahead when pitch is 0", () => {
      const cam = new ThirdPersonCamera(0, 0);
      const out = new THREE.Vector3();
      cam.getLookDirection(out);
      expect(out.y).toBeCloseTo(0, 5);
      expect(out.z).toBeCloseTo(-1, 5);
    });
  });

  describe("update", () => {
    it("positions camera behind and above the player", () => {
      const cam = new ThirdPersonCamera(0, 0);
      const camera = new THREE.PerspectiveCamera();
      cam.update(camera, 0, 0, 0, 0.016);
      expect(camera.position.x).toBeCloseTo(0, 1);
      expect(camera.position.y).toBeGreaterThan(0);
      expect(camera.position.z).toBeGreaterThan(0);
    });

    it("smooths camera position over multiple updates", () => {
      const cam = new ThirdPersonCamera(0, 0);
      const camera = new THREE.PerspectiveCamera();
      const dt = 0.016;
      cam.update(camera, 0, 0, 0, dt);
      const z1 = camera.position.z;
      cam.update(camera, 0, 0, 0, dt);
      const z2 = camera.position.z;
      // After two updates, camera should be closer to the target
      expect(Math.abs(z2 - 5)).toBeLessThanOrEqual(Math.abs(z1 - 5));
    });

    it("initialises camera position on first update", () => {
      const cam = new ThirdPersonCamera(0, 0);
      const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
      const initPos = camera.position.clone();
      cam.update(camera, 10, 5, 20, 0.016);
      // On first update, camera snaps to desired position
      expect(camera.position.distanceTo(initPos)).toBeGreaterThan(1);
    });
  });
});
