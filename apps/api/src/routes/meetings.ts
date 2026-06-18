// Google Meet bot routes. A user points the bot at a Meet link (now or
// scheduled); the MeetingBot Durable Object joins, records, and feeds the audio
// into the normal pipeline. Mounted behind requireUser (see index.ts).

import { Hono } from 'hono';
import { newId } from '@echobit/shared/ids';
import { getUserById, nowIso, sumBotMinutesThisMonth } from '../lib/db.ts';
import { getEffectiveLimits, userPlanView } from '../lib/limits.ts';
import { serializeMeetingBot } from '../lib/serialize.ts';
import { parseBody, schemas } from '../lib/validate.ts';
import type { HonoEnv, MeetingBotRow } from '../types.ts';

const meetings = new Hono<HonoEnv>();

const HARD_MAX_SECS = 10_800; // 3 hours — absolute cap on a single bot session
const DEFAULT_BOT_NAME = 'Echobit Notetaker';
const MAX_SCHEDULE_AHEAD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const isMeetUrl = (url: string): boolean => /^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(url.trim());

meetings.post('/', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.createMeeting);
    if (!body || !isMeetUrl(body.meetingUrl)) {
      return c.json({ error: 'A valid Google Meet link (https://meet.google.com/…) is required' }, 400);
    }
    const userId = c.get('user').id;
    const userRow = await getUserById(c.env, userId);
    const limits = await getEffectiveLimits(
      c.env,
      userRow ? userPlanView(userRow) : { plan: 'free', planExpiresAt: null, featureOverrides: null },
    );

    if (!limits.meetingBot) {
      return c.json(
        { error: 'Recording Google Meet calls requires a Pro or Growth plan. Upgrade to unlock it.', code: 'PLAN_LIMIT_MEETING_BOT' },
        403,
      );
    }

    // Monthly bot-minutes cap (compute-cost control). 0 = no monthly cap.
    let maxDurationSecs = HARD_MAX_SECS;
    if (limits.botMinutesPerMonth > 0) {
      const usedMins = await sumBotMinutesThisMonth(c.env, userId);
      const remainingMins = limits.botMinutesPerMonth - usedMins;
      if (remainingMins <= 0) {
        return c.json(
          { error: `You've used your ${limits.botMinutesPerMonth} bot-recording minutes this month. Upgrade or wait for the next cycle.`, code: 'PLAN_LIMIT_BOT_MINUTES' },
          403,
        );
      }
      maxDurationSecs = Math.min(HARD_MAX_SECS, remainingMins * 60);
    }

    // Resolve schedule: a valid future ISO within the window delays the join.
    let scheduledAtMs: number | null = null;
    let scheduledIso: string | null = null;
    if (body.scheduledAt) {
      const t = Date.parse(body.scheduledAt);
      if (Number.isFinite(t)) {
        if (t - Date.now() > MAX_SCHEDULE_AHEAD_MS) {
          return c.json({ error: 'Meetings can only be scheduled up to 30 days ahead' }, 400);
        }
        if (t > Date.now()) {
          scheduledAtMs = t;
          scheduledIso = new Date(t).toISOString();
        }
      }
    }

    const id = newId();
    const ts = nowIso();
    const title = (body.title || 'Meeting recording').slice(0, 200);
    await c.env.DB.prepare(
      `INSERT INTO meeting_bots (id, user_id, meeting_url, provider, title, scheduled_at, status, duration_secs, created_at, updated_at)
       VALUES (?, ?, ?, 'google_meet', ?, ?, 'scheduled', 0, ?, ?)`,
    )
      .bind(id, userId, body.meetingUrl.trim(), title, scheduledIso, ts, ts)
      .run();

    const stub = c.env.MEETING_BOT.getByName(id);
    await stub.schedule(
      { meetingBotId: id, userId, meetingUrl: body.meetingUrl.trim(), title, botName: DEFAULT_BOT_NAME, maxDurationSecs },
      scheduledAtMs,
    );

    const row = await c.env.DB.prepare('SELECT * FROM meeting_bots WHERE id = ?').bind(id).first<MeetingBotRow>();
    return c.json({ meeting: serializeMeetingBot(row as MeetingBotRow) }, 201);
  } catch (error) {
    console.error('Error creating meeting bot:', error);
    return c.json({ error: 'Failed to schedule meeting bot' }, 500);
  }
});

meetings.get('/', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      'SELECT * FROM meeting_bots WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    )
      .bind(c.get('user').id)
      .all<MeetingBotRow>();
    return c.json({ meetings: (rows.results ?? []).map(serializeMeetingBot) });
  } catch (error) {
    console.error('Error listing meeting bots:', error);
    return c.json({ error: 'Failed to fetch meetings' }, 500);
  }
});

meetings.get('/:id', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT * FROM meeting_bots WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), c.get('user').id)
      .first<MeetingBotRow>();
    if (!row) return c.json({ error: 'Meeting not found' }, 404);
    return c.json({ meeting: serializeMeetingBot(row) });
  } catch (error) {
    console.error('Error fetching meeting bot:', error);
    return c.json({ error: 'Failed to fetch meeting' }, 500);
  }
});

meetings.delete('/:id', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT * FROM meeting_bots WHERE id = ? AND user_id = ?')
      .bind(c.req.param('id'), c.get('user').id)
      .first<MeetingBotRow>();
    if (!row) return c.json({ error: 'Meeting not found' }, 404);

    const active = ['scheduled', 'joining', 'waiting', 'recording'];
    if (active.includes(row.status)) {
      await c.env.MEETING_BOT.getByName(row.id).cancel();
    }
    return c.json({ message: 'Meeting cancelled' });
  } catch (error) {
    console.error('Error cancelling meeting bot:', error);
    return c.json({ error: 'Failed to cancel meeting' }, 500);
  }
});

export default meetings;
