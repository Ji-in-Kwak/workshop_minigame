import type { Metadata, Viewport } from 'next';
import './globals.css';
import './mobile.css';
export const metadata: Metadata = { title: 'LOOP — 워크샵 슬리더링크', description: '휴대폰으로 참여하는 워크샵 개인전. 5×5와 6×6 슬리더링크를 풀고 결과를 확인하세요.', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f6f7f2' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
