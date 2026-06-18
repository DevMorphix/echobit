import type { Env, UserRow, RecordingRow } from '../types.ts';

/** Current timestamp in Mongoose's JSON format (ISO-8601 with milliseconds). */
export const nowIso = (): string => new Date().toISOString();

export const getUserById = (env: Env, id: string) =>
  env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();

export const getUserByEmail = (env: Env, email: string) =>
  env.DB.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
    .bind(email.toLowerCase().trim())
    .first<UserRow>();

export const getRecordingForUser = (env: Env, id: string, userId: string) =>
  env.DB.prepare('SELECT * FROM recordings WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<RecordingRow>();

/**
 * UPDATE helper: builds `SET col1 = ?, col2 = ?, updated_at = ?` from a
 * partial column map, skipping undefined values.
 */
export const updateRow = async (
  env: Env,
  table: 'users' | 'recordings' | 'coupons' | 'plan_configs' | 'meeting_bots',
  id: string,
  cols: Record<string, string | number | null | undefined>,
): Promise<void> => {
  const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const setSql = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([, v]) => v as string | number | null);
  await env.DB.prepare(`UPDATE ${table} SET ${setSql}, updated_at = ? WHERE id = ?`)
    .bind(...values, nowIso(), id)
    .run();
};

/** Start of the current calendar month, ISO (for monthly usage counting). */
export const startOfCurrentMonth = (): string => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export const countRecordingsThisMonth = async (env: Env, userId: string): Promise<number> => {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM recordings WHERE user_id = ? AND created_at >= ?',
  )
    .bind(userId, startOfCurrentMonth())
    .first<{ n: number }>();
  return row?.n ?? 0;
};

export const sumStorageUsed = async (env: Env, userId: string): Promise<number> => {
  const row = await env.DB.prepare(
    'SELECT COALESCE(SUM(audio_size), 0) AS total FROM recordings WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ total: number }>();
  return row?.total ?? 0;
};

/** Bot recording minutes used this calendar month (for the per-plan bot cap). */
export const sumBotMinutesThisMonth = async (env: Env, userId: string): Promise<number> => {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(duration_secs), 0) AS total FROM meeting_bots
     WHERE user_id = ? AND created_at >= ? AND status NOT IN ('failed', 'cancelled')`,
  )
    .bind(userId, startOfCurrentMonth())
    .first<{ total: number }>();
  return Math.round((row?.total ?? 0) / 60);
};
