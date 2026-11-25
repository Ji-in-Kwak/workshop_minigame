import puzzlesRaw from './puzzles.json';
import type { Puzzle, CatalogEntry } from '@/lib/types';

type PuzzleWithSolution = Puzzle & { solution: number[] };

let _catalog: PuzzleWithSolution[] | null = null;

export function catalog(): PuzzleWithSolution[] {
  if (!_catalog) _catalog = puzzlesRaw as PuzzleWithSolution[];
  return _catalog;
}

export function catalogEntry(id: string): PuzzleWithSolution {
  const p = catalog().find(p => p.id === id);
  if (!p) throw new Error(`퍼즐을 찾을 수 없습니다: ${id}`);
  return p;
}

export function publicEntries(): CatalogEntry[] {
  return catalog().map(({ id, size, name, difficulty, practice }) => ({ id, size, name, difficulty, practice }));
}

export function publicPuzzle(p: PuzzleWithSolution): Puzzle {
  const { solution: _, ...rest } = p;
  void _;
  return rest;
}
