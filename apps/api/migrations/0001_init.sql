-- Echobit D1 schema — mirrors the Mongoose models 1:1 so API responses stay identical.
-- Conventions: TEXT PKs (migrated Mongo ObjectId hex / new nanoid), ISO-8601 TEXT
-- timestamps with milliseconds (Mongoose JSON format), INTEGER 0/1 booleans,
-- JSON TEXT for arrays/sub-objects (no consumer filters inside them).

CREATE TABLE users (
  id                          TEXT PRIMARY KEY,
  name                        TEXT NOT NULL,
  email                       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password                    TEXT NOT NULL,            -- bcrypt (migrated) or pbkdf2$... (new)
  google_id                   TEXT,
  avatar                      TEXT,
  is_active                   INTEGER NOT NULL DEFAULT 1,
  is_verified                 INTEGER NOT NULL DEFAULT 0,
  verification_otp            TEXT,
  verification_otp_expires    TEXT,
  reset_password_otp          TEXT,
  reset_password_otp_expires  TEXT,
  privacy_accepted            INTEGER NOT NULL DEFAULT 0,
  privacy_accepted_at         TEXT,
  onboarding_seen             INTEGER NOT NULL DEFAULT 0,
  role                        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  last_login_at               TEXT,
  login_count                 INTEGER NOT NULL DEFAULT 0,
  country                     TEXT,
  profession                  TEXT,
  preferred_language          TEXT,
  summary_language            TEXT,
  auto_save                   INTEGER NOT NULL DEFAULT 1,
  cloud_sync                  INTEGER NOT NULL DEFAULT 1,
  feature_overrides           TEXT NOT NULL DEFAULT '{"meetingMinutes":null,"actionItems":null,"pdfExport":null,"indianLanguages":null}',
  plan                        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro','growth','team')),
  plan_billing_cycle          TEXT CHECK (plan_billing_cycle IN ('monthly','annual')),
  plan_start_date             TEXT,
  plan_expires_at             TEXT,
  created_at                  TEXT NOT NULL,
  updated_at                  TEXT NOT NULL
);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

CREATE TABLE recordings (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  audio_key       TEXT,
  audio_url       TEXT,
  audio_size      INTEGER NOT NULL DEFAULT 0,
  audio_mime_type TEXT NOT NULL DEFAULT 'audio/webm',
  duration        INTEGER NOT NULL DEFAULT 0,
  transcript      TEXT NOT NULL DEFAULT '',
  summary         TEXT NOT NULL DEFAULT '',
  minutes         TEXT NOT NULL DEFAULT '',
  action_items    TEXT NOT NULL DEFAULT '[]',  -- [{_id,task,assignee,priority,deadline,completed}]
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','transcribing','transcribed','summarizing','summarized','completed','failed')),
  tags            TEXT NOT NULL DEFAULT '[]',
  metadata        TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX idx_recordings_user_created ON recordings(user_id, created_at DESC);
CREATE INDEX idx_recordings_user_status ON recordings(user_id, status);
CREATE INDEX idx_recordings_created_at ON recordings(created_at);

CREATE TABLE coupons (
  id               TEXT PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  discount_value   REAL NOT NULL CHECK (discount_value >= 0),
  applicable_plans TEXT NOT NULL DEFAULT '[]',
  max_uses         INTEGER,
  used_count       INTEGER NOT NULL DEFAULT 0,
  expires_at       TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE plan_configs (
  id             TEXT PRIMARY KEY,
  plan           TEXT NOT NULL UNIQUE,
  features       TEXT NOT NULL DEFAULT '[]',   -- [{text,included}]
  monthly_price  TEXT NOT NULL DEFAULT '',
  annual_monthly TEXT NOT NULL DEFAULT '',
  annual_total   TEXT NOT NULL DEFAULT '',
  monthly_paise  INTEGER NOT NULL DEFAULT 0,
  gates          TEXT NOT NULL DEFAULT '{}',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE error_logs (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  message      TEXT NOT NULL,
  user_id      TEXT,
  recording_id TEXT,
  meta         TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
