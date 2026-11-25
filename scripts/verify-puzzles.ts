import puzzles from '../src/lib/server/puzzles.json' with { type: 'json' };
import { topology, validate } from '../src/lib/slitherlink.ts';
import type { Puzzle } from '../src/lib/types.ts';

type PuzzleWithSolution = Puzzle & { solution: number[] };

let pass = 0, fail = 0;

for (const p of puzzles as PuzzleWithSolution[]) {
  const topo = topology(p.size);

  // Check solution indices are within range
  const outOfRange = p.solution.filter(e => e < 0 || e >= topo.edgeCount);
  if (outOfRange.length) {
    console.error(`FAIL [${p.id}] 범위 초과 edge: ${outOfRange.join(', ')}`);
    fail++;
    continue;
  }

  const verdict = validate(p, p.solution);
  if (verdict.correct) {
    console.log(`OK   [${p.id}] ${p.name} (${p.size}×${p.size} ${p.difficulty})`);
    pass++;
  } else {
    console.error(`FAIL [${p.id}] ${p.name}: ${verdict.message}`);
    for (const issue of verdict.issues.slice(0, 5)) {
      console.error(`     ${issue.type}[${issue.index}]: ${issue.message}`);
    }
    fail++;
  }
}

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
if (fail > 0) process.exit(1);
