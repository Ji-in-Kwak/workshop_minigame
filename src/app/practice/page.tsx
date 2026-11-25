'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, PencilLine } from 'lucide-react';
import type { Puzzle, Verdict } from '@/lib/types';
import { Brand, RulesButton } from '@/components/ui';
import { PuzzleEditor } from '@/components/puzzle-editor';
import { validate } from '@/lib/slitherlink';
import { Suspense } from 'react';

function PracticeContent() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/practice', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: Puzzle[]) => { setPuzzles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const puzzle = puzzles[index];

  return (
    <div className="room-shell">
      <header className="site-header">
        <Brand />
        <nav><RulesButton /></nav>
      </header>
      <main className="practice-main">
        <div className="practice-heading">
          <span className="eyebrow">SOLO PRACTICE</span>
          <h1>혼자 연습하기</h1>
          <p>시간 제한 없이 풀어 보세요. 풀이는 기기에 자동 저장됩니다.</p>
        </div>
        {loading && <div className="loading-screen"><p>문제를 불러오고 있어요…</p></div>}
        {!loading && !puzzle && <div className="loading-screen"><p>연습 문제를 찾을 수 없어요.</p></div>}
        {puzzle && (
          <section className="panel practice-panel">
            <div className="panel-heading">
              <h2><PencilLine size={18} /> {puzzle.name}</h2>
              <span className="count-chip">{puzzle.size}×{puzzle.size} · {puzzle.difficulty}</span>
            </div>
            <PuzzleEditor
              key={puzzle.id}
              puzzle={puzzle}
              storageKey={`loop-practice:${puzzle.id}`}
              onSubmit={async (lines, _requestId) => {
                const verdict: Verdict = validate(puzzle, lines);
                return { ...verdict, elapsedMs: null };
              }}
            />
            {puzzles.length > 1 && (
              <div className="practice-actions">
                <button className="text-button" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>
                  <ArrowLeft size={16} /> 이전 문제
                </button>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{index + 1} / {puzzles.length}</span>
                <button className="text-button" disabled={index >= puzzles.length - 1} onClick={() => setIndex(i => i + 1)}>
                  다음 문제 <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        )}
        <Link href="/" className="back-home text-button">← 홈으로 돌아가기</Link>
      </main>
    </div>
  );
}

export default function PracticePage() {
  return <Suspense fallback={<div className="loading-screen"><p>연습 화면을 준비하고 있어요…</p></div>}><PracticeContent /></Suspense>;
}
