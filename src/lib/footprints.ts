export interface Footprint {
  x: number;
  z: number;
  y: number;
  heading: number;
  side: number;
  startTime: number;
}

export const footprints: Footprint[] = [];

let idCounter = 0;

export function addFootprint(x: number, z: number, y: number, heading: number, side: number) {
  footprints.push({
    x,
    z,
    y,
    heading,
    side,
    startTime: performance.now(),
  });
  if (footprints.length > 60) {
    footprints.shift();
  }
  idCounter++;
}

export function clearFootprints() {
  footprints.length = 0;
}

export function getFootprintVersion() {
  return idCounter;
}
