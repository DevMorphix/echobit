-- Better Auth tables (web auth). The user model maps onto the existing `users`
-- table; these three are Better Auth's own. Dates are ISO text, booleans 0/1
-- (kysely-adapter sqlite: supportsDates/supportsBooleans = false).

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  expiresAt TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_session_user_id ON session(userId);

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  password TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX idx_account_user_id ON account(userId);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX idx_verification_identifier ON verification(identifier);

-- Backfill credentials so existing users log in via Better Auth without a reset.
INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), id, 'credential', id, password, created_at, updated_at
FROM users
WHERE password IS NOT NULL AND password != '' AND password != 'better-auth';

INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), google_id, 'google', id, created_at, updated_at
FROM users
WHERE google_id IS NOT NULL AND google_id != '';
