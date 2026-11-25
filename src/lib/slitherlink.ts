import type { Issue, Puzzle, Verdict } from './types';

export type Topology = {
  horizontal: number;
  edgeCount: number;
  endpoints: [number, number][];
  vertices: number[];
};

// Edges numbered: horizontal first (row-major, left→right, top→bottom),
// then vertical (row-major, left→right, top→bottom).
// Horizontal edge (vertex-row r, col c): index = r*size + c
// Vertical edge (gap-row r, col c): index = size*(size+1) + r*(size+1) + c
export function topology(size: number): Topology {
  const horizontal = size * (size + 1);
  const vertical = (size + 1) * size;
  const edgeCount = horizontal + vertical;
  const endpoints: [number, number][] = [];

  for (let r = 0; r <= size; r++) {
    for (let c = 0; c < size; c++) {
      endpoints.push([r * (size + 1) + c, r * (size + 1) + c + 1]);
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size; c++) {
      endpoints.push([r * (size + 1) + c, (r + 1) * (size + 1) + c]);
    }
  }

  const vertices = Array.from({ length: (size + 1) ** 2 }, (_, i) => i);
  return { horizontal, edgeCount, endpoints, vertices };
}

export function validate(puzzle: Puzzle, lines: number[]): Verdict {
  const { size } = puzzle;
  const topo = topology(size);
  const edgeSet = new Set(lines);

  if (edgeSet.size === 0) {
    return { correct: false, message: '선을 그어 보세요.', issues: [] };
  }

  const vertexCount = (size + 1) ** 2;
  const degree = new Array(vertexCount).fill(0);
  for (const edge of edgeSet) {
    if (edge >= 0 && edge < topo.edgeCount) {
      const [a, b] = topo.endpoints[edge];
      degree[a]++;
      degree[b]++;
    }
  }

  const issues: Issue[] = [];

  for (let v = 0; v < vertexCount; v++) {
    if (degree[v] !== 0 && degree[v] !== 2) {
      issues.push({ type: 'vertex', index: v, message: '선이 갈라지거나 끊겼어요.' });
    }
  }

  for (let i = 0; i < size * size; i++) {
    const clue = puzzle.clues[i];
    if (clue === null) continue;
    const r = Math.floor(i / size);
    const c = i % size;
    const H = size;
    const top = r * H + c;
    const bottom = (r + 1) * H + c;
    const left = H * (size + 1) + r * (size + 1) + c;
    const right = H * (size + 1) + r * (size + 1) + c + 1;
    const count = [top, bottom, left, right].filter(e => edgeSet.has(e)).length;
    if (count !== clue) {
      issues.push({ type: 'cell', index: i, message: `${clue}개의 선이 필요해요.` });
    }
  }

  if (!issues.some(i => i.type === 'vertex')) {
    const startVertex = degree.findIndex(d => d === 2);
    if (startVertex >= 0) {
      const adj = new Map<number, number[]>();
      for (const edge of edgeSet) {
        const [a, b] = topo.endpoints[edge];
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
      }

      const visited = new Set<number>([startVertex]);
      let prev = -1, curr = startVertex;
      for (;;) {
        const next = (adj.get(curr) ?? []).find(n => n !== prev);
        if (next === undefined || next === startVertex) break;
        visited.add(next);
        prev = curr;
        curr = next;
      }

      const usedVertices = new Set<number>();
      for (const edge of edgeSet) {
        const [a, b] = topo.endpoints[edge];
        usedVertices.add(a);
        usedVertices.add(b);
      }

      const orphans = new Set([...usedVertices].filter(v => !visited.has(v)));
      if (orphans.size > 0) {
        for (const edge of edgeSet) {
          const [a, b] = topo.endpoints[edge];
          if (orphans.has(a) || orphans.has(b)) {
            issues.push({ type: 'loop', index: edge, message: '고리가 하나가 아니에요.' });
          }
        }
      }
    }
  }

  if (issues.length === 0) {
    return { correct: true, message: '정답입니다!', issues: [] };
  }

  const hasCell = issues.some(i => i.type === 'cell');
  const hasVertex = issues.some(i => i.type === 'vertex');
  const hasLoop = issues.some(i => i.type === 'loop');

  let message = '다시 확인해 보세요.';
  if (hasCell && hasVertex) message = '숫자 조건과 연결을 확인해 보세요.';
  else if (hasCell) message = '숫자 조건이 맞지 않아요.';
  else if (hasVertex) message = '선이 갈라지거나 끊겼어요.';
  else if (hasLoop) message = '고리가 하나가 아니에요.';

  return { correct: false, message, issues };
}
