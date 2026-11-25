// 개발용: puzzles.json을 재생성합니다.
// 현재는 고정 시드로 직접 생성된 문제 8개를 사용하므로 이 명령은 src/lib/server/puzzles.json을 그대로 출력합니다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const path = join(import.meta.dirname, '../src/lib/server/puzzles.json');
const data = JSON.parse(readFileSync(path, 'utf8')) as unknown[];
console.log(`puzzles.json에 문제 ${data.length}개가 있습니다.`);
console.log('자체 생성 로직이 필요하면 이 스크립트를 수정하세요.');
