import { describe, it, expect } from "vitest";
import {
  GRID,
  GLYPH_COUNT,
  SEQUENCE_LENGTH,
  generateSequence,
  checkInput,
} from "./memoryMatrixLogic";

describe("memoryMatrixLogic", () => {
  describe("constants", () => {
    it("GLYPH_COUNT is GRID squared", () => {
      expect(GLYPH_COUNT).toBe(GRID * GRID);
    });

    it("SEQUENCE_LENGTH is a positive integer", () => {
      expect(SEQUENCE_LENGTH).toBeGreaterThan(0);
      expect(Number.isInteger(SEQUENCE_LENGTH)).toBe(true);
    });
  });

  describe("generateSequence", () => {
    it("produces an array of SEQUENCE_LENGTH entries", () => {
      const seq = generateSequence();
      expect(seq).toHaveLength(SEQUENCE_LENGTH);
    });

    it("produces values within glyph range", () => {
      for (let i = 0; i < 100; i++) {
        const seq = generateSequence();
        for (const g of seq) {
          expect(g).toBeGreaterThanOrEqual(0);
          expect(g).toBeLessThan(GLYPH_COUNT);
        }
      }
    });

    it("produces integer values", () => {
      const seq = generateSequence();
      for (const g of seq) {
        expect(Number.isInteger(g)).toBe(true);
      }
    });
  });

  describe("checkInput", () => {
    it("returns correct=true when glyph matches sequence position", () => {
      const seq = [2, 5, 0, 7, 3];
      const result = checkInput(seq, 0, 2);
      expect(result.correct).toBe(true);
      expect(result.nextPos).toBe(1);
      expect(result.complete).toBe(false);
    });

    it("returns correct=false when glyph does not match", () => {
      const seq = [2, 5, 0, 7, 3];
      const result = checkInput(seq, 0, 0);
      expect(result.correct).toBe(false);
      expect(result.nextPos).toBe(0);
      expect(result.complete).toBe(false);
    });

    it("keeps nextPos unchanged on wrong guess", () => {
      const seq = [1, 4, 2, 6, 0];
      const result = checkInput(seq, 3, 1);
      expect(result.correct).toBe(false);
      expect(result.nextPos).toBe(3);
    });

    it("increments nextPos on correct guess", () => {
      const seq = [1, 4, 2, 6, 0];
      const result = checkInput(seq, 1, 4);
      expect(result.correct).toBe(true);
      expect(result.nextPos).toBe(2);
      expect(result.complete).toBe(false);
    });

    it("returns complete=true on the last correct guess", () => {
      const seq = [1, 4, 2, 6, 0];
      const result = checkInput(seq, seq.length - 1, seq[seq.length - 1]);
      expect(result.correct).toBe(true);
      expect(result.nextPos).toBe(seq.length);
      expect(result.complete).toBe(true);
    });

    it("returns complete=false before the last position", () => {
      const seq = [1, 4, 2, 6, 0];
      const result = checkInput(seq, 2, 2);
      expect(result.correct).toBe(true);
      expect(result.complete).toBe(false);
    });

    it("does not return complete=true on wrong guess at last position", () => {
      const seq = [1, 4, 2, 6, 0];
      const result = checkInput(seq, seq.length - 1, 99);
      expect(result.correct).toBe(false);
      expect(result.complete).toBe(false);
    });

    it("handles sequence at position 0", () => {
      const seq = [3, 1, 7, 0, 5];
      const result = checkInput(seq, 0, 3);
      expect(result.correct).toBe(true);
      expect(result.nextPos).toBe(1);
      expect(result.complete).toBe(false);
    });

    it("handles single-element sequence completion", () => {
      const seq = [4];
      const result = checkInput(seq, 0, 4);
      expect(result.correct).toBe(true);
      expect(result.nextPos).toBe(1);
      expect(result.complete).toBe(true);
    });

    it("handles single-element sequence failure", () => {
      const seq = [4];
      const result = checkInput(seq, 0, 2);
      expect(result.correct).toBe(false);
      expect(result.nextPos).toBe(0);
      expect(result.complete).toBe(false);
    });
  });
});
