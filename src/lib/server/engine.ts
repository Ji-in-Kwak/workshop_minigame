import { randomBytes } from 'node:crypto';
import { catalog, catalogEntry, publicEntries, publicPuzzle } from './catalog';
import { validate } from '@/lib/slitherlink';
import type { Mode, Snapshot, Verdict } from '@/lib/types';
import type { RoleCredential } from './http';

export class GameError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = 'GameError';
  }
}

// ── Internal state types (stored as JSONB) ──────────────────────────────────

type RoundPhase = 'ready' | 'playing' | 'closed' | 'revealed';

type Round = {
  index: number;
  puzzleId: string;
  durationSeconds: number;
  phase: RoundPhase;
  startedAt: number | null;
};

type ParticipantRound = {
  submissions: Array<{ requestId: string; correct: boolean; submittedAt: number }>;
  solved: boolean;
  solvedAt: number | null;
  elapsedMs: number | null;
  lines: number[] | null;
};

type Participant = {
  id: string;
  nickname: string;
  token: string;
  eligibleFrom: number;
  rounds: Record<number, ParticipantRound>;
};

export type RoomState = {
  code: string;
  title: string;
  hostToken: string;
  displayToken: string;
  rounds: Round[];
  participants: Participant[];
  currentRound: number;
  finished: boolean;
  createdAt: number;
};

export type Command =
  | { type: 'configure'; puzzleId: string; durationSeconds: number }
  | { type: 'start' }
  | { type: 'close' }
  | { type: 'reveal' }
  | { type: 'next' }
  | { type: 'finish' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function token(): string {
  return randomBytes(32).toString('hex');
}

function uid(): string {
  return randomBytes(8).toString('hex');
}

function getDeadline(round: Round): number | null {
  return round.startedAt ? round.startedAt + round.durationSeconds * 1000 : null;
}

function isActive(round: Round, now: number): boolean {
  const dl = getDeadline(round);
  return round.phase === 'playing' && (dl === null || now < dl);
}

function eligibleParticipants(room: RoomState): Participant[] {
  return room.participants.filter(p => p.eligibleFrom <= room.currentRound);
}

function getRoundState(p: Participant, roundIndex: number): ParticipantRound {
  if (!p.rounds[roundIndex]) {
    p.rounds[roundIndex] = { submissions: [], solved: false, solvedAt: null, elapsedMs: null, lines: null };
  }
  return p.rounds[roundIndex];
}

// ── Public API ───────────────────────────────────────────────────────────────

export function createRoom(code: string, title: string): { room: RoomState; hostToken: string; displayToken: string } {
  const ht = token();
  const dt = token();

  const all = catalog();
  const practice = all.find(p => p.practice) ?? all[0];
  const five = all.find(p => !p.practice && p.size === 5) ?? all[0];
  const six = all.find(p => !p.practice && p.size === 6) ?? all[0];
  const seven = all.find(p => !p.practice && p.size === 7) ?? all[0];

  const room: RoomState = {
    code,
    title,
    hostToken: ht,
    displayToken: dt,
    rounds: [
      { index: 0, puzzleId: practice.id, durationSeconds: 180, phase: 'ready', startedAt: null },
      { index: 1, puzzleId: five.id, durationSeconds: 300, phase: 'ready', startedAt: null },
      { index: 2, puzzleId: six.id, durationSeconds: 480, phase: 'ready', startedAt: null },
      { index: 3, puzzleId: seven.id, durationSeconds: 600, phase: 'ready', startedAt: null },
    ],
    participants: [],
    currentRound: 0,
    finished: false,
    createdAt: Date.now(),
  };

  return { room, hostToken: ht, displayToken: dt };
}

export function joinRoom(
  room: RoomState,
  nickname: string,
  existingToken: string | undefined,
): { playerId: string; playerToken: string } {
  const nick = nickname.trim();
  if (!nick || nick.length > 16) throw new GameError('닉네임은 1~16자로 입력해 주세요.');

  // Returning player with valid token
  if (existingToken) {
    const existing = room.participants.find(p => p.token === existingToken);
    if (existing) {
      if (existing.nickname !== nick) throw new GameError('이미 다른 닉네임으로 입장했어요.');
      return { playerId: existing.id, playerToken: existing.token };
    }
  }

  // Check for duplicate nickname
  if (room.participants.some(p => p.nickname === nick)) {
    throw new GameError('이미 사용 중인 닉네임입니다. 다른 닉네임을 사용해 주세요.');
  }

  if (room.participants.length >= 30) throw new GameError('방이 가득 찼습니다. (최대 30명)');

  const round = room.rounds[room.currentRound];
  const eligibleFrom = round.phase === 'ready' ? room.currentRound : room.currentRound + 1;

  const p: Participant = { id: uid(), nickname: nick, token: token(), eligibleFrom, rounds: {} };
  room.participants.push(p);
  return { playerId: p.id, playerToken: p.token };
}

export function authorize(room: RoomState, cred: { mode: Mode; token: string }): void {
  if (cred.mode === 'host' && room.hostToken === cred.token) return;
  if (cred.mode === 'display' && room.displayToken === cred.token) return;
  if (cred.mode === 'player' && room.participants.some(p => p.token === cred.token)) return;
  throw new GameError('접근 권한이 없습니다.', 403);
}

export function command(room: RoomState, role: RoleCredential, cmd: Command): void {
  if (role.mode !== 'host' || room.hostToken !== role.token) {
    throw new GameError('진행자만 조작할 수 있습니다.', 403);
  }
  if (room.finished) throw new GameError('이미 종료된 워크샵입니다.');

  const round = room.rounds[room.currentRound];
  const now = Date.now();

  switch (cmd.type) {
    case 'configure': {
      if (round.phase !== 'ready') throw new GameError('시작 전에만 설정을 변경할 수 있습니다.');
      const p = catalog().find(p => p.id === cmd.puzzleId);
      if (!p) throw new GameError('선택한 문제를 찾을 수 없습니다.');
      const isPractice = room.currentRound === 0;
      if (p.practice !== isPractice) throw new GameError('라운드에 맞지 않는 문제입니다.');
      if (cmd.durationSeconds < 30 || cmd.durationSeconds > 3600) throw new GameError('제한시간은 30초~3600초로 설정해 주세요.');
      round.puzzleId = cmd.puzzleId;
      round.durationSeconds = cmd.durationSeconds;
      break;
    }
    case 'start': {
      if (round.phase !== 'ready') throw new GameError('이미 시작된 라운드입니다.');
      if (!eligibleParticipants(room).length) throw new GameError('참가자가 없습니다.');
      round.phase = 'playing';
      round.startedAt = now;
      break;
    }
    case 'close': {
      if (round.phase !== 'playing') throw new GameError('진행 중인 라운드만 마감할 수 있습니다.');
      round.phase = 'closed';
      break;
    }
    case 'reveal': {
      if (round.phase !== 'closed' && !(round.phase === 'playing' && now >= (getDeadline(round) ?? Infinity))) {
        throw new GameError('제출을 먼저 마감해 주세요.');
      }
      round.phase = 'revealed';
      break;
    }
    case 'next': {
      if (round.phase !== 'revealed') throw new GameError('결과를 공개한 뒤 다음 라운드로 넘길 수 있습니다.');
      if (room.currentRound >= room.rounds.length - 1) throw new GameError('마지막 라운드입니다.');
      room.currentRound++;
      break;
    }
    case 'finish': {
      if (round.phase !== 'revealed') throw new GameError('결과를 공개한 뒤 종료할 수 있습니다.');
      room.finished = true;
      break;
    }
  }
}

export function submit(
  room: RoomState,
  role: RoleCredential,
  roundIndex: number,
  lines: unknown,
  requestId: unknown,
): Verdict & { elapsedMs: number | null } {
  if (role.mode !== 'player') throw new GameError('참가자만 제출할 수 있습니다.', 403);

  const participant = room.participants.find(p => p.token === role.token);
  if (!participant) throw new GameError('참가자 정보를 찾을 수 없습니다.', 403);

  if (typeof roundIndex !== 'number' || roundIndex !== room.currentRound) {
    throw new GameError('현재 라운드 번호가 올바르지 않습니다.');
  }
  if (!Array.isArray(lines) || !lines.every(l => typeof l === 'number')) {
    throw new GameError('제출 형식이 올바르지 않습니다.');
  }
  if (typeof requestId !== 'string') throw new GameError('제출 ID가 올바르지 않습니다.');

  const round = room.rounds[room.currentRound];
  const now = Date.now();

  if (round.phase === 'ready') throw new GameError('라운드가 아직 시작되지 않았습니다.');
  if (round.phase === 'closed' || round.phase === 'revealed') throw new GameError('제출이 마감되었습니다.');

  const deadline = getDeadline(round);
  if (deadline && now > deadline) throw new GameError('제출 시간이 지났습니다.');

  if (participant.eligibleFrom > room.currentRound) {
    throw new GameError('이번 라운드에는 참여할 수 없습니다.');
  }

  const pRound = getRoundState(participant, roundIndex);

  // Idempotency: same requestId → return same result
  const existing = pRound.submissions.find(s => s.requestId === requestId);
  if (existing) {
    const puzzle = catalogEntry(round.puzzleId);
    const verdict = existing.correct
      ? { correct: true as const, message: '정답입니다!', issues: [] }
      : validate(puzzle, lines as number[]);
    return { ...verdict, elapsedMs: pRound.elapsedMs };
  }

  if (pRound.solved) {
    return { correct: true, message: '이미 정답을 제출했습니다.', issues: [], elapsedMs: pRound.elapsedMs };
  }

  const puzzle = catalogEntry(round.puzzleId);
  const verdict = validate(puzzle, lines as number[]);
  const elapsedMs = round.startedAt ? now - round.startedAt : null;

  pRound.submissions.push({ requestId, correct: verdict.correct, submittedAt: now });

  if (verdict.correct) {
    pRound.solved = true;
    pRound.solvedAt = now;
    pRound.elapsedMs = elapsedMs;
    pRound.lines = lines as number[];
  }

  return { ...verdict, elapsedMs: verdict.correct ? elapsedMs : null };
}

export function snapshot(room: RoomState, role: RoleCredential, storage: 'local' | 'db'): Snapshot {
  authorize(room, role);

  const now = Date.now();
  const round = room.rounds[room.currentRound];
  const puzzle = catalogEntry(round.puzzleId);
  const eligible = eligibleParticipants(room);

  const isHost = role.mode === 'host';
  const me = role.mode === 'player'
    ? room.participants.find(p => p.token === role.token) ?? null
    : null;

  const pRound = me ? (me.rounds[room.currentRound] ?? null) : null;

  const participants = room.participants.map(p => ({
    id: p.id,
    nickname: p.nickname,
    eligibleFrom: p.eligibleFrom,
    ...(isHost && {
      solved: p.rounds[room.currentRound]?.solved ?? false,
      submitted: (p.rounds[room.currentRound]?.submissions.length ?? 0) > 0,
    }),
  }));

  const meInfo = me ? {
    id: me.id,
    nickname: me.nickname,
    eligible: me.eligibleFrom <= room.currentRound,
    solved: pRound?.solved ?? false,
    lines: pRound?.lines ?? null,
    elapsedMs: pRound?.elapsedMs ?? null,
  } : null;

  const puzzleInfo = {
    id: puzzle.id,
    size: puzzle.size,
    name: puzzle.name,
    difficulty: puzzle.difficulty,
    practice: puzzle.practice,
    clues: puzzle.clues,
  };

  const eligibleCount = eligible.length;
  const solvedCount = eligible.filter(p => p.rounds[room.currentRound]?.solved).length;
  const submittedIds = new Set(
    eligible
      .filter(p => (p.rounds[room.currentRound]?.submissions.length ?? 0) > 0)
      .map(p => p.id)
  );

  let rankings = null;
  let roundResults = null;

  if (round.phase === 'revealed' || room.finished) {
    if (room.currentRound === 0) {
      // Practice results
      roundResults = eligible.map(p => ({
        id: p.id,
        nickname: p.nickname,
        elapsedMs: p.rounds[0]?.elapsedMs ?? null,
        eligible: p.eligibleFrom <= 0,
      }));
    } else {
      // Main game rankings (across rounds 1 and 2, up to current)
      const mainRounds = room.rounds.filter(r => r.index > 0 && r.index <= room.currentRound && r.phase === 'revealed');
      const allEligible = room.participants.filter(p => p.eligibleFrom <= 1);

      const scored = allEligible.map(p => {
        let solved = 0, totalMs = 0;
        for (const r of mainRounds) {
          const pr = p.rounds[r.index];
          if (pr?.solved) { solved++; totalMs += pr.elapsedMs ?? 0; }
        }
        return { id: p.id, nickname: p.nickname, solved, elapsedMs: totalMs };
      });

      scored.sort((a, b) => b.solved - a.solved || a.elapsedMs - b.elapsedMs);

      let rank = 1;
      rankings = scored.map((s, i) => {
        if (i > 0 && (s.solved !== scored[i - 1].solved || s.elapsedMs !== scored[i - 1].elapsedMs)) {
          rank = i + 1;
        }
        return { ...s, rank };
      });
    }
  }

  return {
    title: room.title,
    finished: room.finished,
    storage,
    roundCount: room.rounds.length,
    current: {
      index: room.currentRound,
      phase: round.phase,
      puzzle: puzzleInfo,
      durationSeconds: round.durationSeconds,
      deadline: getDeadline(round),
      eligibleCount,
      solvedCount,
      submittedCount: submittedIds.size,
    },
    participants,
    me: meInfo,
    mode: role.mode,
    catalog: isHost ? publicEntries() : null,
    serverNow: now,
    rankings,
    roundResults,
  };
}

// Re-export publicPuzzle for use in practice API if needed
export { publicPuzzle } from './catalog';
