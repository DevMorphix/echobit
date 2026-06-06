import ErrorLog from '../models/ErrorLog.js';

/**
 * Log an error to the DB for admin visibility.
 * Fire-and-forget — never throws.
 */
export async function logError(type, message, { userId, recordingId, meta } = {}) {
  try {
    await ErrorLog.create({ type, message, userId: userId || null, recordingId: recordingId || null, meta: meta || {} });
  } catch (e) {
    console.error('[logError] Failed to write error log:', e.message);
  }
}
