export type Puzzle = {
  id: string;
  size: number;
  name: string;
  difficulty: string;
  practice: boolean;
  clues: (number | null)[];
};

export type Issue = {
  type: 'cell' | 'vertex' | 'loop';
  index: number;
  message: string;
};

export type Verdict = {
  correct: boolean;
  message: string;
  issues: Issue[];
};

export type Mode = 'player' | 'host' | 'display';

export type RoundPhase = 'ready' | 'playing' | 'closed' | 'revealed';

export type ParticipantInfo = {
  id: string;
  nickname: string;
  eligibleFrom: number;
  solved?: boolean;
  submitted?: boolean;
};

export type MeInfo = {
  id: string;
  nickname: string;
  eligible: boolean;
  solved: boolean;
  lines: number[] | null;
  elapsedMs: number | null;
};

export type RoundInfo = {
  index: number;
  phase: RoundPhase;
  puzzle: { id: string; size: number; name: string; difficulty: string; practice: boolean; clues: (number | null)[] };
  durationSeconds: number;
  deadline: number | null;
  eligibleCount: number;
  solvedCount: number;
  submittedCount: number;
};

export type RankEntry = {
  id: string;
  nickname: string;
  rank: number;
  solved: number;
  elapsedMs: number;
};

export type RoundResult = {
  id: string;
  nickname: string;
  elapsedMs: number | null;
  eligible: boolean;
};

export type CatalogEntry = {
  id: string;
  size: number;
  name: string;
  difficulty: string;
  practice: boolean;
};

export type Snapshot = {
  title: string;
  finished: boolean;
  storage: 'local' | 'db';
  current: RoundInfo;
  participants: ParticipantInfo[];
  me: MeInfo | null;
  mode: Mode;
  catalog: CatalogEntry[] | null;
  serverNow: number;
  rankings: RankEntry[] | null;
  roundResults: RoundResult[] | null;
};
