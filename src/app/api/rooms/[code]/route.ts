import type { NextRequest } from 'next/server';
import { command, joinRoom, snapshot, submit, GameError, authorize, type Command } from '@/lib/server/engine';
import { getRoom, updateRoom, storageKind } from '@/lib/server/store';
import { body, credentials, fail, ok } from '@/lib/server/http';
type Context = { params: Promise<{ code: string }> };
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: Context) {
  try {
    const code = (await context.params).code.toUpperCase();
    const mode = request.nextUrl.searchParams.get('mode');
    const token = request.headers.get('x-loop-token');
    console.log(`[GET /rooms/${code}] mode=${mode} token=${token ? token.slice(0, 8) + '...' : 'MISSING'}`);
    const role = credentials(mode, request);
    return ok(snapshot(await getRoom(code), role, storageKind()));
  } catch (error) { return fail(error); }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const code = (await context.params).code.toUpperCase(), input = await body(request);
    if (input.type === 'join') {
      if (typeof input.nickname !== 'string') throw new GameError('닉네임을 입력해 주세요.');
      const existing = request.headers.get('x-loop-token') ?? undefined;
      const result = await updateRoom(code, room => joinRoom(room, input.nickname, existing));
      return ok({ playerId: result.playerId, token: result.playerToken });
    }
    if (input.type === 'display-access') {
      if (typeof input.token !== 'string' || input.token.length > 100) throw new GameError('공용 화면 접속 정보를 확인해 주세요.');
      authorize(await getRoom(code), { mode: 'display', token: input.token });
      return ok({ success: true });
    }
    if (input.type === 'submit') {
      const role = credentials('player', request);
      const result = await updateRoom(code, room => submit(room, role, input.roundIndex, input.lines, input.requestId));
      return ok(result);
    }
    if (!['configure', 'start', 'close', 'reveal', 'next', 'finish'].includes(input.type)) throw new GameError('지원하지 않는 요청입니다.');
    const role = credentials('host', request);
    const result = await updateRoom(code, room => { command(room, role, input as Command); return snapshot(room, role, storageKind()); });
    return ok(result);
  } catch (error) { return fail(error); }
}
