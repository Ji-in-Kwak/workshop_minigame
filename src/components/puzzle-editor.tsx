'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, PencilLine, RotateCcw, Send, Undo2, X, CircleHelp, ZoomIn, ZoomOut } from 'lucide-react';
import { Board, type Marks } from './board';
import type { Puzzle, Verdict } from '@/lib/types';
import { topology } from '@/lib/slitherlink';
import { formatTime } from './ui';
import { submissionId } from '@/lib/client-id';

function restored(key: string, size: number): Marks {
  try { const raw = JSON.parse(localStorage.getItem(key) || '{}'); const max = topology(size).edgeCount; return Object.fromEntries(Object.entries(raw).filter(([e, m]) => Number.isInteger(+e) && +e >= 0 && +e < max && (m === 'line' || m === 'cross'))) as Marks; } catch { return {}; }
}
export function PuzzleEditor({ puzzle, storageKey, disabled = false, solved = false, solvedLines, elapsedMs, onSubmit }: { puzzle: Puzzle; storageKey: string; disabled?: boolean; solved?: boolean; solvedLines?: number[] | null; elapsedMs?: number | null; onSubmit: (lines: number[], requestId: string) => Promise<Verdict & { elapsedMs?: number | null }> }) {
  const [marks, setMarks] = useState<Marks>(() => restored(storageKey, puzzle.size));
  const [history, setHistory] = useState<Marks[]>([]), [mode, setMode] = useState<'line' | 'cross'>('line');
  const [verdict, setVerdict] = useState<Verdict | null>(null), [error, setError] = useState(''), [savingError, setSavingError] = useState(false), [busy, setBusy] = useState(false), [ownTime, setOwnTime] = useState<number | null>(null);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const complete = solved || verdict?.correct, locked = disabled || !!complete || busy;
  useEffect(() => { if (solvedLines) setMarks(Object.fromEntries(solvedLines.map(e => [e, 'line']))); }, [solvedLines]);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(marks)); setSavingError(false); } catch { setSavingError(true); } }, [marks, storageKey]);
  function update(next: Marks) { setHistory(prev => [...prev.slice(-99), marks]); setMarks(next); setVerdict(null); setError(''); request.current = null; }
  function toggle(edge: number) { const next = { ...marks }; if (next[edge] === mode) delete next[edge]; else next[edge] = mode; update(next); }
  async function send() {
    if (locked) return;
    setBusy(true); setError('');
    const lines = Object.entries(marks).filter(([, m]) => m === 'line').map(([e]) => +e).sort((a, b) => a - b), signature = JSON.stringify(lines);
    try { if (request.current?.signature !== signature) request.current = { signature, id: submissionId() }; const result = await onSubmit(lines, request.current!.id); setVerdict(result); if (result.correct) setOwnTime(result.elapsedMs ?? null); request.current = null; }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="editor"><div className="board-topline"><span className="board-name"><span className="tiny-loop" />{puzzle.size} × {puzzle.size} <span className="separator">/</span> {puzzle.difficulty}</span><span className="autosave">{savingError ? '기기 저장 불가' : '기기에 자동 저장'}</span></div>
    <div className="board-view-controls"><span>작게 보이면 확대해서 풀어보세요.</span><button type="button" className="text-button board-zoom" aria-pressed={zoomed} onClick={() => setZoomed(z => !z)}>{zoomed ? <ZoomOut size={17} /> : <ZoomIn size={17} />}{zoomed ? '축소' : '확대'}</button></div><div className={`board-scroll ${zoomed ? 'zoomed' : ''}`} role="region" aria-label="퍼즐 영역" tabIndex={zoomed ? 0 : undefined}><div className={`board-surface ${complete ? 'board-complete' : ''}`}><Board puzzle={puzzle} marks={marks} issues={verdict?.issues} disabled={locked} onToggle={toggle} /></div></div>{zoomed && <p className="zoom-hint">화면을 밀어 퍼즐의 다른 부분을 확인하세요.</p>}
    {complete ? <div className="success-message" role="status"><span className="success-icon"><Check size={20} /></span><div><strong>정답입니다.</strong><p>{(elapsedMs ?? ownTime) != null ? `${formatTime((elapsedMs ?? ownTime)!)} 만에 정답 · ` : ''}결과가 공개될 때까지 기다려 주세요.</p></div></div> : <><div className="board-toolbar"><div className="mode-switch" role="group" aria-label="입력 모드"><button className={mode === 'line' ? 'selected' : ''} aria-pressed={mode === 'line'} disabled={locked} onClick={() => setMode('line')}><PencilLine size={17} /> 선 긋기</button><button className={mode === 'cross' ? 'selected' : ''} aria-pressed={mode === 'cross'} disabled={locked} onClick={() => setMode('cross')}><X size={19} /> 금지 표시</button></div><div className="board-tools"><button className="icon-button" aria-label="되돌리기" title="되돌리기" disabled={locked || !history.length} onClick={() => { setMarks(history[history.length - 1]); setHistory(h => h.slice(0, -1)); setVerdict(null); setError(''); request.current = null; }}><Undo2 size={19} /></button><button className="icon-button" aria-label="전체 지우기" title="전체 지우기" disabled={locked || !Object.keys(marks).length} onClick={() => { if (window.confirm('그린 선과 금지 표시를 모두 지울까요? 되돌리기로 복구할 수 있어요.')) update({}); }}><RotateCcw size={18} /></button></div></div><p className="board-hint"><CircleHelp size={14} />점 사이를 눌러 표시해요. 한 번 더 누르면 지워져요.</p>
    {verdict && !verdict.correct && <div className="verdict-error" role="status"><strong>{verdict.message}</strong><ul>{[...new Set(verdict.issues.map(i => i.message))].slice(0, 3).map(message => <li key={message}>{message}</li>)}</ul></div>}
    {error && <p className="error-text" role="alert">{error}</p>}
    {savingError && <p className="error-text">브라우저 저장소를 사용할 수 없어 새로고침 시 풀이가 사라질 수 있습니다.</p>}
    <button className="button primary full submit-answer" disabled={locked} onClick={send}>{busy ? '답을 확인하고 있어요…' : disabled ? '지금은 제출할 수 없어요' : '정답 제출하기'}<Send size={17} /></button></>}
  </div>;
}
