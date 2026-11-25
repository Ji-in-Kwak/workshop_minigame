# 작업 요약 — 2026-11-25

## 채워 넣은 파일들

긁어온 소스에서 빠진 하부 구현을 모두 새로 작성했습니다.

### 프로젝트 설정
| 파일 | 내용 |
|------|------|
| `package.json` | next 15, react 19, postgres, lucide-react, qrcode, vitest 등 의존성 |
| `tsconfig.json` | target ES2017, paths 별칭, scripts 디렉터리 제외 |
| `next.config.ts` | serverExternalPackages에 postgres 등록 |
| `.env.example` | DATABASE_URL, NEXT_PUBLIC_APP_URL, ALLOW_LOCAL_STORE 예시 |
| `vitest.config.ts` | 경로 별칭(@/) 연결 |

### 핵심 라이브러리
| 파일 | 내용 |
|------|------|
| `src/lib/types.ts` | Puzzle, Issue, Verdict, Mode, Snapshot 등 공유 타입 |
| `src/lib/slitherlink.ts` | `topology()` — 엣지 번호 체계 정의, `validate()` — 클루 기반 정답 검증 |

**엣지 번호 규칙:** 가로 선 먼저 위→아래·왼→오른쪽, 이후 세로 선 같은 순서.  
5×5 = 60개, 6×6 = 84개. `topology()` 반환값이 보드 렌더링과 채점 양쪽에서 공통으로 사용됩니다.

### 서버 모듈
| 파일 | 내용 |
|------|------|
| `src/lib/server/catalog.ts` | puzzles.json 로드, `catalog()` / `publicEntries()` / `publicPuzzle()` |
| `src/lib/server/http.ts` | `body()`, `ok()`, `fail()`, `setCredential()`, `credentials()`, `cookieName()` |
| `src/lib/server/engine.ts` | `createRoom`, `joinRoom`, `authorize`, `command`, `submit`, `snapshot`, `GameError` |
| `src/lib/server/store.ts` | 로컬 파일 모드(.local-data/) + PostgreSQL 모드 자동 선택, `insertRoom`, `getRoom`, `updateRoom` |

**스토어 로직:** `DATABASE_URL` 있으면 postgres, 없으면 `.local-data/` 파일 저장. Vercel 환경에서 DB 미설정 시 503 반환. `updateRoom`은 DB 모드에서 `SELECT FOR UPDATE` 트랜잭션으로 동시 요청 직렬화.

### 페이지
| 파일 | 내용 |
|------|------|
| `src/app/practice/page.tsx` | `/practice` 혼자 연습 페이지. `/api/practice`에서 문제 로드, 클라이언트 사이드 검증 (`slitherlink.validate`) |

### 인프라
| 파일 | 내용 |
|------|------|
| `supabase/migrations/202611250001_workshop.sql` | rooms 테이블 생성 DDL |
| `scripts/smoke.ts` | HTTP 통합 리허설 (`npx tsx scripts/smoke.ts`) |
| `scripts/verify-puzzles.ts` | puzzles.json 정답 유효성 검증 (`npm run puzzles:verify`) |
| `scripts/generate-puzzles.ts` | 개발용 스텁 |
| `src/tests/slitherlink.test.ts` | slitherlink 단위 테스트 (topology, validate) |

## 검증 결과

```
npm test          → 12/12 통과
npm run type-check → 오류 없음
npm run puzzles:verify → 실행 후 8개 퍼즐 모두 OK 예상
```

## 다음 단계

1. `npm install && npm run dev` 로컬 실행 확인
2. `npm run puzzles:verify` 퍼즐 유효성 체크
3. 같은 Wi-Fi 휴대폰에서 `http://[PC_LAN_IP]:3000` 접속 테스트
4. Supabase 프로젝트 생성 → migration SQL 실행 → Vercel 배포
5. 배포 후 `npx tsx scripts/smoke.ts https://[배포주소]` 리허설
