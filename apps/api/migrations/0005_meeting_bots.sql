-- Meeting bots: a scheduled/on-demand bot that joins a Google Meet, records the
-- audio, and feeds it into the existing transcription pipeline. One row per bot
-- run; `recording_id` links to the produced recording once audio is captured.
-- Dates are ISO text (parity with the rest of the schema).

CREATE TABLE meeting_bots (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  meeting_url   TEXT NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'google_meet',
  title         TEXT,
  scheduled_at  TEXT,                       -- null = join now
  status        TEXT NOT NULL DEFAULT 'scheduled',
  -- scheduled | joining | waiting | recording | uploading | processing | done | failed | cancelled
  recording_id  TEXT,                       -- set once audio lands and a recording is created
  duration_secs INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX idx_meeting_bots_user ON meeting_bots(user_id, created_at DESC);
CREATE INDEX idx_meeting_bots_status ON meeting_bots(status);
