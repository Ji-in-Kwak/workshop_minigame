/**
 * HTTP 통합 리허설 스크립트
 * 사용법: npx tsx scripts/smoke.ts [base_url]
 * 기본값: http://localhost:3000
 */

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

type FetchResult<T> = { data: T; headers: Headers };

async function request<T>(
  path: string,
  options?: RequestInit & { cookie?: string },
): Promise<FetchResult<T>> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.cookie ? { Cookie: options.cookie } : {}),
      ...options?.headers,
    },
  });
  const data = await res.json() as T;
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${(data as { error?: string }).error ?? JSON.stringify(data)}`);
  return { data, headers: res.headers };
}

function setCookies(headers: Headers): string {
  return (headers.getSetCookie?.() ?? []).join('; ');
}

async function run() {
  console.log(`\n🔎  LOOP smoke test → ${BASE}\n`);

  // 1. Create room
  console.log('1. 방 생성');
  const { data: roomData, headers: roomHeaders } = await request<{ code: string; displayToken: string }>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ title: 'Smoke Test Room' }),
  });
  const { code } = roomData;
  const hostCookie = setCookies(roomHeaders);
  console.log(`   방 코드: ${code}`);

  // 2. Join 3 participants
  console.log('2. 참가자 3명 입장');
  const players: Array<{ cookie: string; id: string; nick: string }> = [];
  for (const nick of ['Alice', 'Bob', 'Charlie']) {
    const { data, headers } = await request<{ playerId: string }>(`/api/rooms/${code}`, {
      method: 'POST',
      body: JSON.stringify({ type: 'join', nickname: nick }),
    });
    players.push({ cookie: setCookies(headers), id: data.playerId, nick });
    console.log(`   ${nick} 입장 (id: ${data.playerId})`);
  }

  // 3. Run all 3 rounds
  for (let roundIndex = 0; roundIndex <= 2; roundIndex++) {
    console.log(`\n3-${roundIndex + 1}. 라운드 ${roundIndex} (${roundIndex === 0 ? '연습' : `본게임 ${roundIndex}`})`);

    // Start round
    await request(`/api/rooms/${code}`, {
      method: 'POST',
      body: JSON.stringify({ type: 'start' }),
      cookie: hostCookie,
    });
    console.log('   시작');

    // Get puzzle for this round
    const { data: snapshot } = await request<{ current: { puzzle: { clues: (number | null)[]; size: number } } }>(
      `/api/rooms/${code}?mode=host`,
      { cookie: hostCookie },
    );
    const { puzzle } = snapshot.current;

    // Build a simple (possibly incorrect) solution: just submit edge 0 as a single line
    const lines = [0];

    // 6 submissions per round (some duplicates)
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const player of players) {
        const requestId = `smoke-r${roundIndex}-p${player.id}-a${attempt}`;
        const { data: verdict } = await request<{ correct: boolean; message: string }>(
          `/api/rooms/${code}`,
          {
            method: 'POST',
            body: JSON.stringify({ type: 'submit', roundIndex, lines, requestId }),
            cookie: player.cookie,
          },
        );
        if (attempt === 0) console.log(`   ${player.nick}: ${verdict.message} (correct=${verdict.correct})`);
      }
    }

    // Close and reveal
    await request(`/api/rooms/${code}`, {
      method: 'POST',
      body: JSON.stringify({ type: 'close' }),
      cookie: hostCookie,
    });
    await request(`/api/rooms/${code}`, {
      method: 'POST',
      body: JSON.stringify({ type: 'reveal' }),
      cookie: hostCookie,
    });
    console.log('   결과 공개 완료');

    // Advance or finish
    if (roundIndex < 2) {
      await request(`/api/rooms/${code}`, {
        method: 'POST',
        body: JSON.stringify({ type: 'next' }),
        cookie: hostCookie,
      });
    } else {
      await request(`/api/rooms/${code}`, {
        method: 'POST',
        body: JSON.stringify({ type: 'finish' }),
        cookie: hostCookie,
      });
      console.log('\n   워크샵 종료');
    }
  }

  // 4. Final state check
  const { data: final } = await request<{ finished: boolean; rankings: unknown[] | null }>(
    `/api/rooms/${code}?mode=host`,
    { cookie: hostCookie },
  );
  if (!final.finished) throw new Error('finished가 true가 아닙니다.');
  console.log(`\n✅  Smoke test 통과. 최종 순위: ${JSON.stringify(final.rankings)}\n`);
}

run().catch(e => { console.error('\n❌ ', e.message); process.exit(1); });
