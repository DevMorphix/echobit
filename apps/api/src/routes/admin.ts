// Admin routes — port of backend/routes/admin.js with Mongo aggregations
// rewritten as SQL. The whole surface is gated by Cloudflare Access (requireCfAccess).

import { Hono } from 'hono';
import { newId } from '@echobit/shared/ids';
import { requireCfAccess } from '../middleware/cfAccess.ts';
import { serializeCoupon, serializeUser } from '../lib/serialize.ts';
import { nowIso, updateRow } from '../lib/db.ts';
import { deleteAudio } from '../lib/storage.ts';
import { parseBody, schemas } from '../lib/validate.ts';
import type { CouponRow, HonoEnv, PlanConfigRow, UserRow } from '../types.ts';

const admin = new Hono<HonoEnv>();
admin.use('*', requireCfAccess);

const bool = (v: number | null): boolean => !!v;

/** Admin list/detail user shape (the old routes' .select(...) subset). */
const adminUser = (u: UserRow) => ({
  _id: u.id,
  name: u.name,
  email: u.email,
  isVerified: bool(u.is_verified),
  privacyAccepted: bool(u.privacy_accepted),
  privacyAcceptedAt: u.privacy_accepted_at,
  role: u.role,
  plan: u.plan,
  planBillingCycle: u.plan_billing_cycle,
  planStartDate: u.plan_start_date,
  planExpiresAt: u.plan_expires_at,
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at,
  loginCount: u.login_count,
  googleId: u.google_id,
});

const dayKey = (iso: string): string => iso.slice(0, 10);

const fillDays = (raw: { day: string; count: number }[], startDate: Date, days: number) => {
  const map = Object.fromEntries(raw.map((d) => [d.day, d.count]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0] as string;
    return { date: key, count: map[key] || 0 };
  });
};

// Identity of the Access-authenticated admin (gateway for the panel to confirm
// it's behind Cloudflare Access before rendering).
admin.get('/me', (c) => c.json({ email: c.get('adminEmail') ?? '' }));

// ── Stats overview ───────────────────────────────────────────────────────────
admin.get('/stats', async (c) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOf7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const row = await c.env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE is_verified = 1) AS verified_users,
        (SELECT COUNT(*) FROM users WHERE privacy_accepted = 1) AS privacy_accepted,
        (SELECT COUNT(*) FROM users WHERE created_at >= ?1) AS today_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= ?2) AS weekly_users,
        (SELECT COUNT(*) FROM recordings) AS total_recordings,
        (SELECT COUNT(*) FROM recordings WHERE created_at >= ?1) AS today_recordings,
        (SELECT COUNT(*) FROM recordings WHERE transcript != '') AS transcribed_recordings,
        (SELECT COUNT(*) FROM recordings WHERE created_at >= ?2) AS weekly_recordings`,
    )
      .bind(startOfToday, startOf7Days)
      .first<Record<string, number>>();

    return c.json({
      users: {
        total: row?.total_users ?? 0,
        verified: row?.verified_users ?? 0,
        privacyAccepted: row?.privacy_accepted ?? 0,
        today: row?.today_users ?? 0,
        week: row?.weekly_users ?? 0,
      },
      recordings: {
        total: row?.total_recordings ?? 0,
        today: row?.today_recordings ?? 0,
        transcribed: row?.transcribed_recordings ?? 0,
        week: row?.weekly_recordings ?? 0,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// ── Users list ───────────────────────────────────────────────────────────────
admin.get('/users', async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
    const limit = Math.min(100, parseInt(c.req.query('limit') ?? '20', 10) || 20);
    const search = (c.req.query('search') ?? '').trim();

    const where = search ? 'WHERE name LIKE ?1 OR email LIKE ?1' : '';
    const params = search ? [`%${search}%`] : [];

    const [usersRes, totalRow] = await Promise.all([
      c.env.DB.prepare(
        `SELECT u.*, (SELECT COUNT(*) FROM recordings r WHERE r.user_id = u.id) AS recording_count
         FROM users u ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      )
        .bind(...params)
        .all<UserRow & { recording_count: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS n FROM users ${where}`)
        .bind(...params)
        .first<{ n: number }>(),
    ]);

    const total = totalRow?.n ?? 0;
    const users = (usersRes.results ?? []).map((u) => ({
      ...adminUser(u),
      recordingCount: u.recording_count || 0,
    }));

    return c.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin users error:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// ── Single user detail ───────────────────────────────────────────────────────
admin.get('/users/:id', async (c) => {
  try {
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(c.req.param('id'))
      .first<UserRow>();
    if (!user) return c.json({ error: 'User not found' }, 404);

    const recordings = await c.env.DB.prepare(
      `SELECT id, title, duration, status, created_at, transcript
       FROM recordings WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    )
      .bind(user.id)
      .all<{ id: string; title: string; duration: number; status: string; created_at: string; transcript: string }>();

    return c.json({
      user: adminUser(user),
      recordings: (recordings.results ?? []).map((r) => ({
        _id: r.id,
        title: r.title,
        duration: r.duration,
        status: r.status,
        createdAt: r.created_at,
        transcript: r.transcript,
      })),
    });
  } catch {
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// ── Delete user + their recordings ──────────────────────────────────────────
admin.delete('/users/:id', async (c) => {
  try {
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(c.req.param('id'))
      .first<UserRow>();
    if (!user) return c.json({ error: 'User not found' }, 404);
    if (user.role === 'admin') return c.json({ error: 'Cannot delete admin accounts' }, 403);

    const recordings = await c.env.DB.prepare(
      'SELECT audio_key FROM recordings WHERE user_id = ? AND audio_key IS NOT NULL',
    )
      .bind(user.id)
      .all<{ audio_key: string }>();
    await Promise.allSettled(
      (recordings.results ?? []).map((r) => deleteAudio(c.env, r.audio_key)),
    );

    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM recordings WHERE user_id = ?').bind(user.id),
      c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// ── Per-user feature overrides ───────────────────────────────────────────────
admin.patch('/users/:id/overrides', async (c) => {
  try {
    const FIELDS = ['meetingMinutes', 'actionItems', 'pdfExport', 'indianLanguages'] as const;
    const body = await parseBody(c.req, schemas.overridesPatch);
    if (!body) return c.json({ error: 'No valid fields provided' }, 400);

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(c.req.param('id'))
      .first<UserRow>();
    if (!user) return c.json({ error: 'User not found' }, 404);

    let overrides: Record<string, boolean | null>;
    try {
      overrides = JSON.parse(user.feature_overrides);
    } catch {
      overrides = { meetingMinutes: null, actionItems: null, pdfExport: null, indianLanguages: null };
    }

    let changed = false;
    for (const f of FIELDS) {
      if (f in body) {
        overrides[f] = body[f] ?? null;
        changed = true;
      }
    }
    if (!changed) return c.json({ error: 'No valid fields provided' }, 400);

    await updateRow(c.env, 'users', user.id, { feature_overrides: JSON.stringify(overrides) });
    const updated = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(user.id)
      .first<UserRow>();
    return c.json({ user: serializeUser(updated as UserRow) });
  } catch (error) {
    console.error('Override update error:', error);
    return c.json({ error: 'Failed to update overrides' }, 500);
  }
});

// ── Recordings list ──────────────────────────────────────────────────────────
admin.get('/recordings', async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
    const limit = Math.min(100, parseInt(c.req.query('limit') ?? '20', 10) || 20);
    const search = (c.req.query('search') ?? '').trim();

    const where = search ? 'WHERE r.title LIKE ?1' : '';
    const params = search ? [`%${search}%`] : [];

    const [recsRes, totalRow] = await Promise.all([
      c.env.DB.prepare(
        `SELECT r.id, r.title, r.duration, r.status, r.created_at, r.audio_size,
                r.audio_mime_type, r.transcript, r.user_id, u.name AS user_name, u.email AS user_email
         FROM recordings r LEFT JOIN users u ON u.id = r.user_id
         ${where} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      )
        .bind(...params)
        .all<{
          id: string; title: string; duration: number; status: string; created_at: string;
          audio_size: number; audio_mime_type: string; transcript: string;
          user_id: string; user_name: string | null; user_email: string | null;
        }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS n FROM recordings r ${where}`)
        .bind(...params)
        .first<{ n: number }>(),
    ]);

    const total = totalRow?.n ?? 0;
    const recordings = (recsRes.results ?? []).map((r) => ({
      _id: r.id,
      title: r.title,
      duration: r.duration,
      status: r.status,
      createdAt: r.created_at,
      audioSize: r.audio_size,
      audioMimeType: r.audio_mime_type,
      transcript: r.transcript,
      // populate('user', 'name email') parity
      user: r.user_name ? { _id: r.user_id, name: r.user_name, email: r.user_email } : null,
    }));

    return c.json({ recordings, total, page, pages: Math.ceil(total / limit) });
  } catch {
    return c.json({ error: 'Failed to fetch recordings' }, 500);
  }
});

// ── Analytics ──────────────────────────────────────────────────────────────
admin.get('/analytics', async (c) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(c.req.query('days') ?? '30', 10) || 30));
    const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    const startIso = startDate.toISOString();

    const [usersPerDay, recsPerDay, statusBreakdown, counts, totals, topUsers] = await Promise.all([
      c.env.DB.prepare(
        `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count
         FROM users WHERE created_at >= ? GROUP BY day ORDER BY day`,
      )
        .bind(startIso)
        .all<{ day: string; count: number }>(),
      c.env.DB.prepare(
        `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count
         FROM recordings WHERE created_at >= ? GROUP BY day ORDER BY day`,
      )
        .bind(startIso)
        .all<{ day: string; count: number }>(),
      c.env.DB.prepare(
        'SELECT status AS _id, COUNT(*) AS count FROM recordings GROUP BY status ORDER BY count DESC',
      ).all<{ _id: string; count: number }>(),
      c.env.DB.prepare(
        `SELECT
          (SELECT COUNT(*) FROM users WHERE google_id IS NOT NULL) AS google_users,
          (SELECT COUNT(*) FROM users) AS total_users,
          (SELECT COUNT(*) FROM users WHERE privacy_accepted = 1) AS privacy_accepted`,
      ).first<{ google_users: number; total_users: number; privacy_accepted: number }>(),
      c.env.DB.prepare(
        'SELECT COALESCE(SUM(duration), 0) AS total_seconds, COALESCE(SUM(audio_size), 0) AS total_size FROM recordings',
      ).first<{ total_seconds: number; total_size: number }>(),
      c.env.DB.prepare(
        `SELECT r.user_id AS _id, u.name, u.email, COUNT(*) AS count, SUM(r.duration) AS totalDuration
         FROM recordings r LEFT JOIN users u ON u.id = r.user_id
         GROUP BY r.user_id ORDER BY count DESC LIMIT 10`,
      ).all<{ _id: string; name: string | null; email: string | null; count: number; totalDuration: number }>(),
    ]);

    const googleUsers = counts?.google_users ?? 0;
    const totalUsers = counts?.total_users ?? 0;
    const privacyAccepted = counts?.privacy_accepted ?? 0;

    return c.json({
      signupsPerDay: fillDays(usersPerDay.results ?? [], startDate, days),
      recordingsPerDay: fillDays(recsPerDay.results ?? [], startDate, days),
      statusBreakdown: statusBreakdown.results ?? [],
      authMethods: { google: googleUsers, email: totalUsers - googleUsers },
      topUsers: topUsers.results ?? [],
      totalDuration: totals?.total_seconds ?? 0,
      totalSize: totals?.total_size ?? 0,
      privacyConsentRate: totalUsers ? Math.round((privacyAccepted / totalUsers) * 100) : 0,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// ── Recent activity feed ─────────────────────────────────────────────────────
admin.get('/activity', async (c) => {
  try {
    const limit = Math.min(50, parseInt(c.req.query('limit') ?? '30', 10) || 30);

    const [recentUsers, recentRecordings, recentErrors] = await Promise.all([
      c.env.DB.prepare(
        `SELECT name, email, created_at, is_verified, privacy_accepted, google_id
         FROM users ORDER BY created_at DESC LIMIT ${limit}`,
      ).all<{ name: string; email: string; created_at: string; is_verified: number; privacy_accepted: number; google_id: string | null }>(),
      c.env.DB.prepare(
        `SELECT r.title, r.status, r.created_at, u.name AS user_name
         FROM recordings r LEFT JOIN users u ON u.id = r.user_id
         ORDER BY r.created_at DESC LIMIT ${limit}`,
      ).all<{ title: string; status: string; created_at: string; user_name: string | null }>(),
      c.env.DB.prepare(
        `SELECT e.type, e.message, e.created_at, u.name AS user_name
         FROM error_logs e LEFT JOIN users u ON u.id = e.user_id
         ORDER BY e.created_at DESC LIMIT ${limit}`,
      ).all<{ type: string; message: string; created_at: string; user_name: string | null }>(),
    ]);

    const TYPE_LABEL: Record<string, string> = {
      transcription_failed: 'Transcription failed',
      summary_failed: 'Summary generation failed',
      minutes_failed: 'Minutes generation failed',
      actions_failed: 'Action items failed',
    };

    const events = [
      ...(recentUsers.results ?? []).map((u) => ({
        type: 'register',
        text: `${u.name} (${u.email}) registered${u.google_id ? ' via Google' : ''}`,
        verified: bool(u.is_verified),
        privacyAccepted: bool(u.privacy_accepted),
        timestamp: u.created_at,
      })),
      ...(recentRecordings.results ?? []).map((r) => ({
        type: 'recording',
        text: `${r.user_name || 'Unknown'} created "${r.title}"`,
        status: r.status,
        timestamp: r.created_at,
      })),
      ...(recentErrors.results ?? []).map((e) => ({
        type: 'error',
        text: `${TYPE_LABEL[e.type] || e.type}${e.user_name ? ` — ${e.user_name}` : ''}: ${e.message}`,
        errorType: e.type,
        timestamp: e.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return c.json({ events });
  } catch {
    return c.json({ error: 'Failed to fetch activity' }, 500);
  }
});

// ── API Costs & Company Expenses ─────────────────────────────────────────────
admin.get('/costs', async (c) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(c.req.query('days') ?? '30', 10) || 30));
    const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    // Pricing (USD) — kept as constants; tune when provider pricing changes
    const SARVAM_COST_PER_MIN = 0.003;
    const GEMINI_INPUT_PER_1M = 0.075;
    const GEMINI_OUTPUT_PER_1M = 0.3;
    const R2_COST_PER_GB_MONTH = 0.015;
    const CHARS_PER_TOKEN = 4;

    const [allTime, perDay, topAgg] = await Promise.all([
      c.env.DB.prepare(
        `SELECT
          COALESCE(SUM(duration) / 60.0, 0) AS sarvam_minutes,
          COALESCE(SUM(transcript_chars), 0) AS transcript_chars,
          COALESCE(SUM(summary_chars + minutes_chars), 0) AS output_chars,
          (SELECT COALESCE(SUM(audio_size), 0) FROM recordings) AS storage_bytes
         FROM recordings WHERE transcript_chars > 0`,
      ).first<{ sarvam_minutes: number; transcript_chars: number; output_chars: number; storage_bytes: number }>(),
      c.env.DB.prepare(
        `SELECT substr(created_at, 1, 10) AS day,
                SUM(duration) / 60.0 AS minutes,
                SUM(transcript_chars) AS transcript_chars,
                SUM(summary_chars + minutes_chars) AS output_chars
         FROM recordings WHERE created_at >= ? AND transcript_chars > 0
         GROUP BY day`,
      )
        .bind(startDate.toISOString())
        .all<{ day: string; minutes: number; transcript_chars: number; output_chars: number }>(),
      c.env.DB.prepare(
        `SELECT r.user_id AS _id, u.name, u.email,
                SUM(r.duration) / 60.0 AS totalMinutes,
                SUM(r.transcript_chars) AS transcriptChars,
                SUM(r.summary_chars + r.minutes_chars) AS summaryChars,
                COUNT(*) AS recordingCount
         FROM recordings r LEFT JOIN users u ON u.id = r.user_id
         WHERE r.transcript_chars > 0
         GROUP BY r.user_id ORDER BY totalMinutes DESC LIMIT 10`,
      ).all<{
        _id: string; name: string | null; email: string | null;
        totalMinutes: number; transcriptChars: number; summaryChars: number; recordingCount: number;
      }>(),
    ]);

    const totalSarvamMinutes = allTime?.sarvam_minutes ?? 0;
    const totalGeminiIn = (allTime?.transcript_chars ?? 0) / CHARS_PER_TOKEN;
    const totalGeminiOut = (allTime?.output_chars ?? 0) / CHARS_PER_TOKEN;
    const totalStorageBytes = allTime?.storage_bytes ?? 0;

    const sarvamCost = totalSarvamMinutes * SARVAM_COST_PER_MIN;
    const geminiCost =
      (totalGeminiIn / 1e6) * GEMINI_INPUT_PER_1M + (totalGeminiOut / 1e6) * GEMINI_OUTPUT_PER_1M;
    const storageCostMonthly = (totalStorageBytes / 1024 ** 3) * R2_COST_PER_GB_MONTH;

    const dayMap: Record<string, { date: string; sarvam: number; gemini: number; total: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0] as string;
      dayMap[key] = { date: key, sarvam: 0, gemini: 0, total: 0 };
    }
    for (const row of perDay.results ?? []) {
      const entry = dayMap[row.day];
      if (!entry) continue;
      const s = (row.minutes ?? 0) * SARVAM_COST_PER_MIN;
      const g =
        ((row.transcript_chars ?? 0) / CHARS_PER_TOKEN / 1e6) * GEMINI_INPUT_PER_1M +
        ((row.output_chars ?? 0) / CHARS_PER_TOKEN / 1e6) * GEMINI_OUTPUT_PER_1M;
      entry.sarvam += s;
      entry.gemini += g;
      entry.total += s + g;
    }

    const topUsers = (topAgg.results ?? []).map((u) => {
      const sarvam = (u.totalMinutes ?? 0) * SARVAM_COST_PER_MIN;
      const gemini =
        ((u.transcriptChars ?? 0) / CHARS_PER_TOKEN / 1e6) * GEMINI_INPUT_PER_1M +
        ((u.summaryChars ?? 0) / CHARS_PER_TOKEN / 1e6) * GEMINI_OUTPUT_PER_1M;
      return { ...u, sarvamCost: sarvam, geminiCost: gemini, totalCost: sarvam + gemini };
    });

    return c.json({
      allTime: {
        sarvamCost,
        geminiCost,
        storageCostMonthly,
        totalCost: sarvamCost + geminiCost + storageCostMonthly,
        sarvamMinutes: Math.round(totalSarvamMinutes * 10) / 10,
        geminiInputTokens: Math.round(totalGeminiIn),
        geminiOutputTokens: Math.round(totalGeminiOut),
        storageGB: totalStorageBytes / 1024 ** 3,
      },
      costsPerDay: Object.values(dayMap),
      topUsers,
      pricing: { SARVAM_COST_PER_MIN, GEMINI_INPUT_PER_1M, GEMINI_OUTPUT_PER_1M, R2_COST_PER_GB_MONTH },
    });
  } catch (error) {
    console.error('Admin costs error:', error);
    return c.json({ error: 'Failed to fetch costs' }, 500);
  }
});

// ── Subscriptions / Revenue ───────────────────────────────────────────────────
admin.get('/subscriptions', async (c) => {
  try {
    const now = new Date();
    const allUsersRes = await c.env.DB.prepare(
      `SELECT id, name, email, plan, plan_billing_cycle, plan_start_date, plan_expires_at,
              created_at, is_verified FROM users`,
    ).all<Pick<UserRow, 'id' | 'name' | 'email' | 'plan' | 'plan_billing_cycle' | 'plan_start_date' | 'plan_expires_at' | 'created_at' | 'is_verified'>>();

    const allUsers = (allUsersRes.results ?? []).map((u) => ({
      _id: u.id,
      name: u.name,
      email: u.email,
      plan: u.plan,
      planBillingCycle: u.plan_billing_cycle,
      planStartDate: u.plan_start_date,
      planExpiresAt: u.plan_expires_at,
      createdAt: u.created_at,
      isVerified: bool(u.is_verified),
    }));

    const activePaid = allUsers.filter(
      (u) => u.plan && u.plan !== 'free' && u.planExpiresAt && new Date(u.planExpiresAt) > now,
    );
    const churned = allUsers.filter(
      (u) => u.plan && u.plan !== 'free' && u.planExpiresAt && new Date(u.planExpiresAt) <= now,
    );
    const freeUsers = allUsers.filter((u) => !u.plan || u.plan === 'free');

    const planConfigsRes = await c.env.DB.prepare(
      'SELECT plan, monthly_paise FROM plan_configs',
    ).all<{ plan: string; monthly_paise: number }>();
    const planConfigs = planConfigsRes.results ?? [];
    const DEFAULT_PAISE: Record<string, number> = {
      free: 0, starter: 14900, pro: 49900, growth: 99900, team: 79900,
    };
    const planPaise: Record<string, number> = {};
    for (const key of ['free', 'starter', 'pro', 'growth', 'team']) {
      const cfg = planConfigs.find((p) => p.plan === key);
      planPaise[key] = cfg?.monthly_paise || DEFAULT_PAISE[key] || 0;
    }

    let mrr = 0;
    for (const u of activePaid) {
      mrr += planPaise[u.plan] || 0; // annual subscribers count monthly equivalent
    }
    mrr = Math.round(mrr / 100); // paise → rupees

    const arr = mrr * 12;
    const arpu = activePaid.length > 0 ? Math.round(mrr / activePaid.length) : 0;
    const churnRate = allUsers.length > 0 ? Math.round((churned.length / allUsers.length) * 100) : 0;

    return c.json({
      stats: {
        totalUsers: allUsers.length,
        activePaid: activePaid.length,
        activePro: activePaid.filter((u) => u.plan === 'pro').length,
        activeTeam: activePaid.filter((u) => u.plan === 'team').length,
        freeUsers: freeUsers.length,
        churnedUsers: churned.length,
        mrrInr: mrr,
        arrInr: arr,
        arpuInr: arpu,
        churnRate,
      },
      planBreakdown: {
        pro: activePaid.filter((u) => u.plan === 'pro').length,
        team: activePaid.filter((u) => u.plan === 'team').length,
        expired: churned.length,
        free: freeUsers.length,
      },
      subscribers: activePaid.sort(
        (a, b) => new Date(b.planStartDate || 0).getTime() - new Date(a.planStartDate || 0).getTime(),
      ),
      churned: churned
        .sort((a, b) => new Date(b.planExpiresAt as string).getTime() - new Date(a.planExpiresAt as string).getTime())
        .slice(0, 30),
      freeUsersList: freeUsers
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50),
    });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return c.json({ error: 'Failed to fetch subscription data' }, 500);
  }
});

// ── Coupons ───────────────────────────────────────────────────────────────────
admin.get('/coupons', async (c) => {
  try {
    const res = await c.env.DB.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all<CouponRow>();
    return c.json({ coupons: (res.results ?? []).map(serializeCoupon) });
  } catch {
    return c.json({ error: 'Failed to fetch coupons' }, 500);
  }
});

admin.post('/coupons', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.couponCreate);
    if (!body || !body.code || !body.discountType || body.discountValue == null) {
      return c.json({ error: 'code, discountType, and discountValue are required' }, 400);
    }
    const { code, discountType, discountValue, applicablePlans, maxUses, expiresAt } = body;

    const normalizedCode = code.toUpperCase().trim();
    const existing = await c.env.DB.prepare('SELECT id FROM coupons WHERE code = ?')
      .bind(normalizedCode)
      .first();
    if (existing) return c.json({ error: 'Coupon code already exists' }, 400);

    const ts = nowIso();
    const id = newId();
    await c.env.DB.prepare(
      `INSERT INTO coupons (id, code, discount_type, discount_value, applicable_plans, max_uses, used_count, expires_at, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)`,
    )
      .bind(
        id,
        normalizedCode,
        discountType,
        Number(discountValue),
        JSON.stringify(applicablePlans || []),
        maxUses ? Number(maxUses) : null,
        expiresAt || null,
        ts,
        ts,
      )
      .run();

    const coupon = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first<CouponRow>();
    return c.json({ coupon: serializeCoupon(coupon as CouponRow) }, 201);
  } catch {
    return c.json({ error: 'Failed to create coupon' }, 500);
  }
});

admin.patch('/coupons/:id', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.couponPatch);
    if (!body) return c.json({ error: 'Failed to update coupon' }, 500);
    const { isActive, maxUses, expiresAt } = body;

    const existing = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?')
      .bind(c.req.param('id'))
      .first<CouponRow>();
    if (!existing) return c.json({ error: 'Coupon not found' }, 404);

    await updateRow(c.env, 'coupons', existing.id, {
      is_active: isActive !== undefined ? (isActive ? 1 : 0) : undefined,
      max_uses: maxUses !== undefined ? (maxUses ? Number(maxUses) : null) : undefined,
      expires_at: expiresAt !== undefined ? expiresAt || null : undefined,
    });

    const coupon = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?')
      .bind(existing.id)
      .first<CouponRow>();
    return c.json({ coupon: serializeCoupon(coupon as CouponRow) });
  } catch {
    return c.json({ error: 'Failed to update coupon' }, 500);
  }
});

admin.delete('/coupons/:id', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to delete coupon' }, 500);
  }
});

// ── Plan feature config ──────────────────────────────────────────────────────
const serializePlanConfig = (row: PlanConfigRow) => ({
  _id: row.id,
  plan: row.plan,
  features: JSON.parse(row.features),
  monthlyPrice: row.monthly_price,
  annualMonthly: row.annual_monthly,
  annualTotal: row.annual_total,
  monthlyPaise: row.monthly_paise,
  gates: JSON.parse(row.gates),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  __v: 0,
});

admin.get('/plans', async (c) => {
  try {
    const res = await c.env.DB.prepare('SELECT * FROM plan_configs').all<PlanConfigRow>();
    return c.json((res.results ?? []).map(serializePlanConfig));
  } catch {
    return c.json({ error: 'Failed to load plan configs' }, 500);
  }
});

admin.put('/plans/:plan', async (c) => {
  const plan = c.req.param('plan');
  if (!['free', 'starter', 'pro', 'growth', 'team'].includes(plan)) {
    return c.json({ error: 'Invalid plan' }, 400);
  }
  const body = await parseBody(c.req, schemas.planConfigPut);
  if (!body || !Array.isArray(body.features)) {
    return c.json({ error: 'features must be an array' }, 400);
  }
  const { features, monthlyPrice, annualMonthly, annualTotal, monthlyPaise, gates } = body;
  try {
    const existing = await c.env.DB.prepare('SELECT * FROM plan_configs WHERE plan = ?')
      .bind(plan)
      .first<PlanConfigRow>();

    if (existing) {
      await updateRow(c.env, 'plan_configs', existing.id, {
        features: JSON.stringify(features),
        monthly_price: monthlyPrice,
        annual_monthly: annualMonthly,
        annual_total: annualTotal,
        monthly_paise: monthlyPaise !== undefined ? Number(monthlyPaise) : undefined,
        gates: gates !== undefined ? JSON.stringify(gates) : undefined,
      });
    } else {
      const ts = nowIso();
      await c.env.DB.prepare(
        `INSERT INTO plan_configs (id, plan, features, monthly_price, annual_monthly, annual_total, monthly_paise, gates, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          newId(),
          plan,
          JSON.stringify(features),
          monthlyPrice ?? '',
          annualMonthly ?? '',
          annualTotal ?? '',
          monthlyPaise !== undefined ? Number(monthlyPaise) : 0,
          JSON.stringify(gates ?? {}),
          ts,
          ts,
        )
        .run();
    }

    const config = await c.env.DB.prepare('SELECT * FROM plan_configs WHERE plan = ?')
      .bind(plan)
      .first<PlanConfigRow>();
    return c.json(serializePlanConfig(config as PlanConfigRow));
  } catch {
    return c.json({ error: 'Failed to save plan config' }, 500);
  }
});

export default admin;
