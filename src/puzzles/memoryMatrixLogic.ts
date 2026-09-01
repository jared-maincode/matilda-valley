export const GRID = 3;
export const GLYPH_COUNT = GRID * GRID;
export const SEQUENCE_LENGTH = 5;

export type MemoryPhase = "idle" | "showing" | "input" | "done";

export function generateSequence(): number[] {
  return Array.from(
    { length: SEQUENCE_LENGTH },
    () => Math.floor(Math.random() * GLYPH_COUNT),
  );
}

export function checkInput(
  sequence: number[],
  inputPos: number,
  glyphIndex: number,
): { correct: boolean; nextPos: number; complete: boolean } {
  const isCorrect = glyphIndex === sequence[inputPos];
  if (!isCorrect) {
    return { correct: false, nextPos: inputPos, complete: false };
  }
  const nextPos = inputPos + 1;
  return { correct: true, nextPos, complete: nextPos >= sequence.length };
}
