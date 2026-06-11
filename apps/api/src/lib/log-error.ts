import { newId } from '@echobit/shared/ids';
import { nowIso } from './db.ts';
import type { Env } from '../types.ts';

/** Log an error to D1 for admin visibility. Fire-and-forget — never throws. */
export async function logError(
  env: Env,
  type: string,
  message: string,
  opts: { userId?: string | null; recordingId?: string | null; meta?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    const ts = nowIso();
    await env.DB.prepare(
      'INSERT INTO error_logs (id, type, message, user_id, recording_id, meta, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        newId(),
        type,
        message,
        opts.userId ?? null,
        opts.recordingId ?? null,
        JSON.stringify(opts.meta ?? {}),
        ts,
        ts,
      )
      .run();
  } catch (e) {
    console.error('[logError] Failed to write error log:', (e as Error).message);
  }
}
