import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { GameError, type RoomState } from './engine';

// ── Storage mode ─────────────────────────────────────────────────────────────

export function storageKind(): 'local' | 'db' {
  return process.env.DATABASE_URL ? 'db' : 'local';
}

function requireStorage(): 'local' | 'db' {
  if (process.env.DATABASE_URL) return 'db';
  if (process.env.VERCEL) {
    throw new GameError(
      '데이터베이스가 설정되지 않았습니다. Vercel 환경변수에 DATABASE_URL을 설정해 주세요.',
      503,
    );
  }
  return 'local';
}

// ── Local file store (dev / single-process rehearsal only) ───────────────────

const DATA_DIR = join(process.cwd(), '.local-data');

function localPath(code: string): string {
  return join(DATA_DIR, `${code.toLowerCase()}.json`);
}

function localRead(code: string): RoomState | null {
  const p = localPath(code);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')) as RoomState; } catch { return null; }
}

function localWrite(room: RoomState): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(localPath(room.code), JSON.stringify(room));
}

// ── Postgres store ────────────────────────────────────────────────────────────

let _sql: ReturnType<typeof postgres> | null = null;

function sql(): ReturnType<typeof postgres> {
  if (!_sql) {
    _sql = postgres(process.env.DATABASE_URL!, {
      prepare: false,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connect_timeout: 10,
      idle_timeout: 20,
    });
  }
  return _sql;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function insertRoom(room: RoomState): Promise<boolean> {
  const kind = requireStorage();
  if (kind === 'local') {
    if (localRead(room.code)) return false;
    localWrite(room);
    return true;
  }
  const data = JSON.stringify(room);
  const rows = await sql()`
    INSERT INTO rooms (code, data)
    VALUES (${room.code}, ${data}::jsonb)
    ON CONFLICT (code) DO NOTHING
    RETURNING code
  `;
  return rows.length > 0;
}

export async function getRoom(code: string): Promise<RoomState> {
  const kind = requireStorage();
  if (kind === 'local') {
    const room = localRead(code);
    if (!room) throw new GameError('방을 찾을 수 없습니다.', 404);
    return room;
  }
  const rows = await sql()`SELECT data FROM rooms WHERE code = ${code}`;
  if (!rows.length) throw new GameError('방을 찾을 수 없습니다.', 404);
  const raw = rows[0].data;
  console.log(`[getRoom ${code}] typeof data=${typeof raw}, hostToken=${(raw as any)?.hostToken?.slice?.(0, 8) ?? 'MISSING'}`);
  const room = typeof raw === 'string' ? JSON.parse(raw) as RoomState : raw as RoomState;
  return room;
}

export async function updateRoom<T>(code: string, fn: (room: RoomState) => T): Promise<T> {
  const kind = requireStorage();

  if (kind === 'local') {
    const room = await getRoom(code);
    const result = fn(room);
    localWrite(room);
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = await (sql().begin as any)(async (tx: any) => {
    const rows = await tx`SELECT data FROM rooms WHERE code = ${code} FOR UPDATE`;
    if (!rows.length) throw new GameError('방을 찾을 수 없습니다.', 404);
    const raw = rows[0].data;
    const room = typeof raw === 'string' ? JSON.parse(raw) as RoomState : raw as RoomState;
    const result = fn(room);
    const data = JSON.stringify(room);
    await tx`UPDATE rooms SET data = ${data}::jsonb WHERE code = ${code}`;
    return result;
  });
  return out as T;
}
