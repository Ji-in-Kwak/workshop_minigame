'use client';
import Link from 'next/link';
import { CircleHelp, X, Check, Copy, Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="LOOP 홈"><span className="brand-symbol"><Link2 size={25} strokeWidth={3} /></span><span>LOOP<span className="brand-period">.</span></span>{!compact && <span className="brand-caption">WORKSHOP PLAYGROUND</span>}</Link>;
}
export function Rules({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  return <dialog ref={ref} className="rules-dialog" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="dialog-content"><button className="icon-button close-dialog" onClick={onClose} aria-label="설명 닫기"><X /></button><span className="eyebrow">HOW TO PLAY</span><h2>규칙은 세 가지.<br />연결은 하나.</h2><ol className="rule-list"><li><span>01</span><div><strong>숫자만큼 선을 그어요</strong><p>칸 안의 숫자는 그 칸을 둘러싼 선의 개수예요. 빈칸에는 개수 제한이 없어요.</p></div></li><li><span>02</span><div><strong>하나의 고리로 연결해요</strong><p>이웃한 점을 가로나 세로로 이어요. 모든 선이 하나의 닫힌 고리가 되어야 해요.</p></div></li><li><span>03</span><div><strong>갈라지거나 교차하지 않아요</strong><p>사용한 점에는 선이 정확히 두 개 연결돼요. 작은 고리가 따로 생겨도 안 돼요.</p></div></li></ol><div className="tip"><CircleHelp size={20} /><p>선을 그리지 않을 곳에는 <b>× 표시</b>를 남겨 보세요. 제출 후에는 오류 위치를 확인하고 다시 도전할 수 있어요.</p></div><button className="button primary full" onClick={onClose}>좋아요, 이해했어요</button></div></dialog>;
}
export function RulesButton() { const [open, setOpen] = useState(false); return <><button className="text-button" onClick={() => setOpen(true)}><CircleHelp size={17} /> 게임 방법</button>{open && <Rules onClose={() => setOpen(false)} />}</>; }
export function QR({ value, size = 180 }: { value: string; size?: number }) {
  const [data, setData] = useState('');
  useEffect(() => { let active = true; setData(''); QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#142d2a', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(url => { if (active) setData(url); }); return () => { active = false; }; }, [value, size]);
  return data ? <img src={data} width={size} height={size} alt="참가자 입장 QR 코드" className="qr-image" /> : <div style={{ width: size, height: size }} className="qr-placeholder" aria-label="QR 코드 생성 중" />;
}
export function CopyButton({ value, label = '링크 복사' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false), [error, setError] = useState(false);
  return <><button className="button subtle" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setError(false); setTimeout(() => setCopied(false), 2000); } catch { setError(true); } }}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? '복사했어요' : label}</button>{error && <small className="error-text">자동 복사를 사용할 수 없습니다. 주소: {value}</small>}</>;
}
export function formatTime(ms: number) { const seconds = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({ error: '서버 응답을 확인할 수 없습니다.' }));
  if (!response.ok) throw new Error(payload.error || '요청을 처리하지 못했습니다.');
  return payload as T;
}
export function publicOrigin() { return (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, ''); }
