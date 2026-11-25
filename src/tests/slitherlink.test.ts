import { describe, it, expect } from 'vitest';
import { topology, validate } from '../lib/slitherlink';
import puzzles from '../lib/server/puzzles.json';
import type { Puzzle } from '../lib/types';

type PuzzleWithSolution = Puzzle & { solution: number[] };

describe('topology', () => {
  it('5×5 edge count', () => {
    const t = topology(5);
    expect(t.edgeCount).toBe(60);
    expect(t.horizontal).toBe(30);
    expect(t.endpoints).toHaveLength(60);
    expect(t.vertices).toHaveLength(36);
  });

  it('6×6 edge count', () => {
    const t = topology(6);
    expect(t.edgeCount).toBe(84);
    expect(t.horizontal).toBe(42);
  });
});

describe('validate', () => {
  it('empty lines → not correct', () => {
    const p = (puzzles as PuzzleWithSolution[])[0];
    const v = validate(p, []);
    expect(v.correct).toBe(false);
  });

  for (const p of puzzles as PuzzleWithSolution[]) {
    it(`solution correct: ${p.id}`, () => {
      const v = validate(p, p.solution);
      expect(v.correct).toBe(true);
      expect(v.issues).toHaveLength(0);
    });
  }

  it('single edge → vertex degree error', () => {
    const p = (puzzles as PuzzleWithSolution[])[0];
    const v = validate(p, [0]);
    expect(v.correct).toBe(false);
    expect(v.issues.some(i => i.type === 'vertex')).toBe(true);
  });
});
