CREATE TABLE IF NOT EXISTS transcriptions (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(200) NOT NULL DEFAULT '',
  text             TEXT NOT NULL,
  language         VARCHAR(50) NOT NULL DEFAULT 'Multilingual',
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at
  ON transcriptions (created_at DESC);
