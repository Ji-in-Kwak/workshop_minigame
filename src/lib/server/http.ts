import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { GameError } from './engine';
import type { Mode } from '@/lib/types';

export type RoleCredential = { mode: Mode; token: string };

export function cookieName(code: string, type: 'host' | 'player' | 'display'): string {
  return `loop-${type}-${code.toLowerCase()}`;
}

export function ok<T>(data: T): NextResponse {
  return NextResponse.json(data);
}

export function fail(error: unknown): NextResponse {
  if (error instanceof GameError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[loop] unexpected error', error instanceof Error ? error.message : String(error));
  return NextResponse.json({ error: '요청을 처리하지 못했습니다.' }, { status: 500 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function body(request: NextRequest): Promise<Record<string, any>> {
  try {
    const data = await request.json();
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new GameError('요청 형식이 올바르지 않습니다.', 400);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as Record<string, any>;
  } catch (e) {
    if (e instanceof GameError) throw e;
    throw new GameError('요청 형식이 올바르지 않습니다.', 400);
  }
}

export function setCredential(response: NextResponse, code: string, type: 'host' | 'player' | 'display', token: string): void {
  response.cookies.set(cookieName(code, type), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function credentials(code: string, mode: string | null): Promise<RoleCredential> {
  const jar = await cookies();
  const hostToken = jar.get(cookieName(code, 'host'))?.value;
  const playerToken = jar.get(cookieName(code, 'player'))?.value;
  const displayToken = jar.get(cookieName(code, 'display'))?.value;

  const resolved = mode as Mode | null ?? (hostToken ? 'host' : playerToken ? 'player' : displayToken ? 'display' : null);

  if (resolved === 'host' && hostToken) return { mode: 'host', token: hostToken };
  if (resolved === 'display' && displayToken) return { mode: 'display', token: displayToken };
  if (resolved === 'player' && playerToken) return { mode: 'player', token: playerToken };

  throw new GameError('접근 권한이 없습니다. 다시 입장해 주세요.', 403);
}
