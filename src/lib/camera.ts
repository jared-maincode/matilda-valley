import * as THREE from "three";
import { CAMERA_DISTANCE, CAMERA_HEIGHT } from "../constants";

const _target = new THREE.Vector3();
const _desired = new THREE.Vector3();

export class ThirdPersonCamera {
  yaw: number;
  pitch: number;

  private _smoothedPos = new THREE.Vector3(0, 5, 55);
  private _initPos = false;

  constructor(yaw = 0, pitch = -0.1) {
    this.yaw = yaw;
    this.pitch = pitch;
  }

  addMouseDelta(dx: number, dy: number, sensitivity: number) {
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.85, 0.35);
  }

  getForward(out: THREE.Vector3): THREE.Vector3 {
    out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    return out;
  }

  getRight(out: THREE.Vector3): THREE.Vector3 {
    out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    return out;
  }

  getLookDirection(out: THREE.Vector3): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    out.set(
      -Math.sin(this.yaw) * cp,
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * cp,
    );
    return out;
  }

  update(
    camera: THREE.Camera,
    playerX: number,
    playerY: number,
    playerZ: number,
    dt: number,
  ) {
    _target.set(playerX, playerY + 0.6, playerZ);

    const dist = CAMERA_DISTANCE;
    const cp = Math.cos(this.pitch);

    _desired.set(
      _target.x + Math.sin(this.yaw) * dist * cp,
      _target.y + CAMERA_HEIGHT - Math.sin(this.pitch) * dist,
      _target.z + Math.cos(this.yaw) * dist * cp,
    );

    if (!this._initPos) {
      this._smoothedPos.copy(_desired);
      this._initPos = true;
    }

    const lerpFactor = 1 - Math.exp(-14 * dt);
    this._smoothedPos.lerp(_desired, lerpFactor);

    camera.position.copy(this._smoothedPos);
    camera.lookAt(_target);
  }
}
