import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { getToonGradient } from "./toon";

describe("getToonGradient", () => {
  it("returns a DataTexture", () => {
    const tex = getToonGradient();
    expect(tex).toBeInstanceOf(THREE.DataTexture);
  });

  it("returns the same reference on repeated calls (caching)", () => {
    const a = getToonGradient();
    const b = getToonGradient();
    expect(a).toBe(b);
  });

  it("has dimensions 3x1", () => {
    const tex = getToonGradient();
    expect(tex.image.width).toBe(3);
    expect(tex.image.height).toBe(1);
  });

  it("uses RedFormat", () => {
    const tex = getToonGradient();
    expect(tex.format).toBe(THREE.RedFormat);
  });

  it("uses NearestFilter for mag and min", () => {
    const tex = getToonGradient();
    expect(tex.magFilter).toBe(THREE.NearestFilter);
    expect(tex.minFilter).toBe(THREE.NearestFilter);
  });

  it("contains correct gradient values [0, 127, 255]", () => {
    const tex = getToonGradient();
    const data = tex.image.data as Uint8Array;
    expect(data.length).toBe(3);
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(127);
    expect(data[2]).toBe(255);
  });
});
