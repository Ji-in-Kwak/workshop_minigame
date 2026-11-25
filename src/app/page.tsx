'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ScanLine, Users, MousePointer2, Sparkles, Grid2X2, Play, Monitor, X, Check, Timer, PencilLine } from 'lucide-react';
import { Brand, RulesButton, api } from '@/components/ui';
import { Board } from '@/components/board';
const illustration = { id: 'hero', name: '하나의 연결', size: 5, difficulty: '', practice: true, clues: [null, 2, 2, null, 0, 3, null, null, 2, null, 2, null, 1, null, 2, null, 3, null, 2, null, 0, null, 2, null, 3] };
const heroLines = [1, 2, 6, 8, 11, 13, 14, 16, 19, 21, 22, 23, 31, 33, 36, 39, 42, 46, 47, 50, 52, 53];
function HomeContent() {
  const router = useRouter(), search = useSearchParams();
  const [code, setCode] = useState(''), [nickname, setNickname] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [hosting, setHosting] = useState(false), [title, setTitle] = useState('팀 워크샵');
  useEffect(() => { const invite = search.get('code'); if (invite) setCode(invite.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)); }, [search]);
  async function join(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api(`/api/rooms/${code}`, { method: 'POST', body: JSON.stringify({ type: 'join', nickname }) }); router.push(`/room/${code}`); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = await api<{ code: string; displayToken: string }>('/api/rooms', { method: 'POST', body: JSON.stringify({ title }) }); sessionStorage.setItem(`loop-display-${result.code}`, result.displayToken); router.push(`/host/${result.code}`); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="home-shell"><header className="site-header"><Brand /><nav><RulesButton /><button className="button header-host" onClick={() => { setHosting(true); setError(''); }}><Monitor size={16} /> 진행자 모드</button></nav></header>
    <main><section className="home-hero"><div className="hero-copy"><div className="pill"><span className="tiny-loop" /> WORKSHOP / INDIVIDUAL GAME</div><h1>팀 워크샵<br /><span>슬리더링크</span></h1><p className="hero-description">방 코드를 입력하고 개인전에 참여하세요.<br />연습 1회, 본게임 2회로 진행합니다.</p><div className="hero-meta"><span><Users size={16} /> 약 17명이 함께</span><i /><span><ScanLine size={16} /> 설치 없이 바로</span></div>
    <div className="hero-art"><div className="art-label"><span className="art-cross">+</span> SLITHERLINK PUZZLE</div><div className="art-board"><Board puzzle={illustration} marks={Object.fromEntries(heroLines.map(i => [i, 'line' as const]))} disabled decorative /><span className="floating-label"><span className="green-check"><Check size={13} /></span> 슬리더링크 예시</span><div className="art-cursor"><MousePointer2 size={25} fill="currentColor" /><span>your next move</span></div></div><div className="art-caption"><span>SLITHERLINK / 5 × 5</span><span>5 × 5 / 6 × 6</span></div></div></div>
    <div className="entry-column"><div className="entry-card"><div className="entry-icon"><ScanLine size={24} /></div><span className="eyebrow">JOIN GAME</span><h2>게임 참가</h2><p className="muted">화면에 보이는 방 코드로 입장해 주세요.</p><form onSubmit={join}><label htmlFor="room-code">방 코드 <span>ROOM CODE</span></label><input id="room-code" className="code-input" autoComplete="off" autoCapitalize="characters" placeholder="ABC123" value={code} maxLength={6} required minLength={6} pattern="[A-Z2-9]{6}" onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))} /><label htmlFor="nickname">닉네임 <span>NICKNAME</span></label><input id="nickname" placeholder="팀원들이 알아볼 수 있는 이름" value={nickname} maxLength={16} required autoComplete="nickname" onChange={e => setNickname(e.target.value)} />{!hosting && error && <p className="error-text" role="alert">{error}</p>}<button className="button primary full entry-submit" disabled={busy}>{busy ? '입장하는 중…' : '게임 입장하기'}<Play size={16} fill="currentColor" /></button></form><div className="entry-note"><span className="small-spark">✳</span> 계정도, 다운로드도 필요 없어요.</div></div>
    <Link href="/practice" className="practice-link"><span className="practice-icon"><PencilLine size={20} /></span><span><strong>연습 문제 풀기</strong><small>혼자 연습하면서 규칙을 익혀 보세요.</small></span><Play size={17} /></Link><p className="entry-bottom">진행자가 시작하면 퍼즐이 표시됩니다.</p></div></section>
    <section className="how-section"><div className="section-heading"><span className="eyebrow">HOW TO PLAY</span><h2>게임 방법</h2><p>슬리더링크는 숫자에 맞춰 선을 잇는 논리 퍼즐이에요.</p></div><div className="feature-grid"><article><span className="feature-icon"><Grid2X2 /></span><span className="feature-number">01 / OBSERVE</span><h3>숫자 조건 확인</h3><p>칸의 숫자만큼 주변에 선을 그어요.<br />0은 비우고, 3은 세 면을 연결!</p></article><article><span className="feature-icon"><PencilLine /></span><span className="feature-number">02 / CONNECT</span><h3>선 연결하기</h3><p>갈라지거나 교차하지 않도록,<br />모든 선을 하나의 고리로 이어요.</p></article><article><span className="feature-icon"><Sparkles /></span><span className="feature-number">03 / COMPLETE</span><h3>제출과 순위</h3><p>맞힐 때까지 다시 도전할 수 있어요.<br />정답 수와 풀이시간으로 순위를 정해요.</p></article></div></section></main>
    <footer className="site-footer"><Brand compact /><span>개인전 · 5×5 / 6×6</span><span>WORKSHOP MINI GAME</span></footer>
    {hosting && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) setHosting(false); }}><section className="host-modal" role="dialog" aria-modal="true" aria-labelledby="host-title"><button className="icon-button close-dialog" onClick={() => setHosting(false)} aria-label="닫기"><X /></button><span className="eyebrow">HOST GAME</span><h2 id="host-title">게임 방 만들기</h2><p className="muted">연습 한 판, 본게임 두 판.<br />준비가 되면 참가자들에게 QR을 보여주세요.</p><form onSubmit={create}><label htmlFor="room-title">워크샵 이름</label><input id="room-title" value={title} maxLength={50} required autoFocus onChange={e => setTitle(e.target.value)} /><div className="room-defaults"><span><Users size={16} /> 개인전 · 최대 30명</span><span><Timer size={16} /> 기본 플레이 16분</span></div>{error && <p role="alert" className="error-text">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? '방을 만드는 중…' : '새로운 방 만들기'}</button></form></section></div>}
  </div>;
}
export default function Home() { return <Suspense fallback={<div className="loading-screen">LOOP를 준비하고 있어요…</div>}><HomeContent /></Suspense>; }
