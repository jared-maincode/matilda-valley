export const FORK_COUNT = 4;
export const PITCH_COUNT = 3;

export const PITCH_COLORS = ["#ffa726", "#22d3ee", "#e879f9"] as const;
export const PITCH_LABELS = ["LOW", "MID", "HIGH"] as const;

export function randomPitch(): number {
  return Math.floor(Math.random() * PITCH_COUNT);
}

export function generateTarget(): number[] {
  return Array.from({ length: FORK_COUNT }, () => randomPitch());
}

export function generateInitial(target: number[]): number[] {
  const pitches: number[] = [];
  for (let i = 0; i < FORK_COUNT; i++) {
    let p = randomPitch();
    while (p === target[i]) p = randomPitch();
    pitches.push(p);
  }
  return pitches;
}

export function cyclePitch(pitches: number[], index: number): number[] {
  return pitches.map((p, i) => (i === index ? (p + 1) % PITCH_COUNT : p));
}

export function matchedCount(pitches: number[], target: number[]): number {
  return pitches.filter((p, i) => p === target[i]).length;
}

export function allMatched(pitches: number[], target: number[]): boolean {
  return matchedCount(pitches, target) === FORK_COUNT;
}
