import { randomInt } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { createRoom, GameError } from '@/lib/server/engine';
import { insertRoom, storageKind } from '@/lib/server/store';
import { body, fail, ok, setCredential } from '@/lib/server/http';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const input = await body(request);
    if (input.title !== undefined && typeof input.title !== 'string') throw new GameError('방 이름을 확인해 주세요.');
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
      const result = createRoom(code, input.title || '우리 팀의 연결');
      if (await insertRoom(result.room)) {
        const response = ok({ code, storage: storageKind(), displayToken: result.displayToken });
        setCredential(response, code, 'host', result.hostToken);
        setCredential(response, code, 'display', result.displayToken);
        return response;
      }
    }
    throw new GameError('방 코드를 생성하지 못했습니다. 다시 시도해 주세요.', 503);
  } catch (error) { return fail(error); }
}
