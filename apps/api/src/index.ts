// Echobit API Worker — serves the Vue SPA (static assets, SPA fallback) and
// the /api routes (run_worker_first). Async transcription runs in
// TranscriptionWorkflow (see workflows/transcribe.ts).

import { Hono } from 'hono';
import authRoutes from './routes/auth.ts';
import recordingsRoutes from './routes/recordings.ts';
import meetingsRoutes from './routes/meetings.ts';
import paymentsRoutes from './routes/payments.ts';
import adminRoutes from './routes/admin.ts';
import plansRoutes from './routes/plans.ts';
import { requireUser } from './middleware/requireUser.ts';
import { createAuth } from './auth/betterAuth.ts';
import { updateRow } from './lib/db.ts';
import { logError } from './lib/log-error.ts';
import type { Env, HonoEnv } from './types.ts';

export { TranscriptionWorkflow } from './workflows/transcribe.ts';
export { FfmpegContainer } from './audio/transcode.ts';
export { MeetingBot } from './meet/bot-do.ts';

const app = new Hono<HonoEnv>();

// CORS — parity with the old hand-rolled middleware (server.js): configured
// origins get echoed; requests with no Origin (mobile app, curl) get '*'.
app.use('*', async (c, next) => {
  const origin = c.req.header('origin');
  const allowed = (c.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const setHeaders = (res: Response) => {
    if (origin && allowed.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
      res.headers.set('Access-Control-Allow-Origin', '*');
    }
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.headers.set(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-captcha-response',
    );
  };

  if (c.req.method === 'OPTIONS') {
    const res = new Response(null, { status: 200 });
    setHeaders(res);
    return res;
  }
  await next();
  setHeaders(c.res);
});

// Better Auth (web) — coexists with the legacy /api/v1/auth routes (mobile).
app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw));

// Public routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/plans', plansRoutes);

// Protected routes — requireUser accepts a Better Auth session or a legacy JWT.
app.use('/api/v1/recordings/*', requireUser);
app.route('/api/v1/recordings', recordingsRoutes);
app.use('/api/v1/meetings/*', requireUser);
app.route('/api/v1/meetings', meetingsRoutes);
app.route('/api/v1/payments', paymentsRoutes);
app.route('/api/v1/admin', adminRoutes);

// Health check — unversioned on purpose. Liveness is an operational concern,
// independent of the API contract version, so monitors keep working across
// version bumps (parity with the old backend's /api/health).
app.get('/api/health', async (c) => {
  let db = 'disconnected';
  try {
    await c.env.DB.prepare('SELECT 1').first();
    db = 'connected';
  } catch {
    // leave as disconnected
  }
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db,
    dbState: db === 'connected' ? 1 : 0,
  });
});

// App SPA shell. The Worker runs first only for app routes (run_worker_first in
// wrangler.jsonc) and /api/*; marketing pages + assets are served statically and
// never reach here. For an app route, return the Vue shell so vue-router can take
// over client-side. Unmatched /api/* falls through to the JSON 404.
app.get('*', async (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Not found' }, 404);
  // Fetch the extensionless shell: "/app-shell.html" 307-redirects to "/app-shell"
  // (Assets html_handling), and returning that redirect breaks the app route.
  const shell = await c.env.ASSETS.fetch(new Request(new URL('/app-shell', c.req.url)));
  return new Response(shell.body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
  });
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error(err.stack ?? err.message);
  return c.json({ error: 'Something went wrong!' }, 500);
});

// ─── Cron sweep: recordings stuck mid-pipeline after a crash ─────────────────
// Only "transcribing" is swept — it's the async in-flight marker. "pending" is
// a legitimate terminal state (autoTranscribe: false), never touch it.

const STUCK_AFTER_MS = 6 * 60 * 60 * 1000;

const sweepStuckRecordings = async (env: Env): Promise<void> => {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS).toISOString();
  const stuck = await env.DB.prepare(
    "SELECT id, user_id FROM recordings WHERE status = 'transcribing' AND updated_at < ?",
  )
    .bind(cutoff)
    .all<{ id: string; user_id: string }>();

  for (const row of stuck.results ?? []) {
    await updateRow(env, 'recordings', row.id, { status: 'failed' });
    await logError(env, 'transcription_failed', 'Stuck in transcribing >6h (cron sweep)', {
      userId: row.user_id,
      recordingId: row.id,
    });
  }
};

export default {
  fetch: app.fetch,

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await sweepStuckRecordings(env);
  },
} satisfies ExportedHandler<Env>;
