'use client';
import type { Issue, Puzzle } from '@/lib/types';
import { topology } from '@/lib/slitherlink';
export type Marks = Record<number, 'line' | 'cross'>;
export function Board({ puzzle, marks, issues = [], disabled = false, onToggle, decorative = false }: { puzzle: Puzzle; marks: Marks; issues?: Issue[]; disabled?: boolean; onToggle?: (edge: number) => void; decorative?: boolean }) {
  const { size } = puzzle, graph = topology(size), step = 64, pad = 22, extent = size * step + pad * 2;
  const point = (vertex: number) => ({ x: pad + vertex % (size + 1) * step, y: pad + Math.floor(vertex / (size + 1)) * step });
  const badCells = new Set(issues.filter(i => i.type === 'cell').map(i => i.index)), badVertices = new Set(issues.filter(i => i.type === 'vertex').map(i => i.index)), badEdges = new Set(issues.filter(i => i.type === 'loop').map(i => i.index));
  return <svg className={`puzzle-board ${disabled ? 'locked' : ''}`} viewBox={`0 0 ${extent} ${extent}`} role="group" aria-label={`${size} 곱하기 ${size} 슬리더링크 퍼즐`}>
    {puzzle.clues.map((clue, i) => <g key={`c${i}`}>{badCells.has(i) && <rect x={pad + i % size * step + 7} y={pad + Math.floor(i / size) * step + 7} width={step - 14} height={step - 14} rx="12" className="bad-cell" />}{clue !== null && <text x={pad + (i % size + 0.5) * step} y={pad + (Math.floor(i / size) + 0.5) * step + 1} textAnchor="middle" dominantBaseline="central" className={`clue ${badCells.has(i) ? 'clue-error' : ''}`}>{clue}</text>}</g>)}
    {graph.endpoints.map(([a, b], i) => { const p = point(a), q = point(b), horizontal = i < graph.horizontal, mark = marks[i]; return <g key={i}>
      <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="grid-edge" />
      {mark === 'line' && <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className={`drawn-edge ${badEdges.has(i) ? 'edge-error' : ''}`} />}
      {mark === 'cross' && <g className="cross-mark"><path d={`M ${(p.x + q.x) / 2 - 5} ${(p.y + q.y) / 2 - 5} l 10 10 m 0 -10 l -10 10`} /></g>}
      {!decorative && <line x1={p.x + (horizontal ? 10 : 0)} y1={p.y + (horizontal ? 0 : 10)} x2={q.x - (horizontal ? 10 : 0)} y2={q.y - (horizontal ? 0 : 10)} className="edge-hit" role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-label={`${horizontal ? '가로' : '세로'} 선 ${i + 1}, ${mark === 'line' ? '선 있음' : mark === 'cross' ? '금지 표시' : '빈 선'}`} onClick={() => { if (!disabled) onToggle?.(i); }} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); onToggle?.(i); } }} />}
    </g>; })}
    {graph.vertices.map((_, i) => { const p = point(i); return <g key={`v${i}`}>{badVertices.has(i) && <circle cx={p.x} cy={p.y} r="10" className="bad-vertex" />}<circle cx={p.x} cy={p.y} r={decorative ? 3.5 : 3} className="grid-dot" /></g>; })}
  </svg>;
}
