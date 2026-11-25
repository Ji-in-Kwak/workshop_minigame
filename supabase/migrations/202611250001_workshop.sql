-- LOOP 워크샵 슬리더링크 · 초기 스키마
-- Supabase SQL Editor에서 한 번 실행하세요.

CREATE TABLE IF NOT EXISTS rooms (
  code        TEXT        PRIMARY KEY,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 오래된 방 조회용 인덱스 (필요 시 운영자가 수동 삭제)
CREATE INDEX IF NOT EXISTS rooms_created_at_idx ON rooms (created_at);
