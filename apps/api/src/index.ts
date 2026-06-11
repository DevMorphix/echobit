// Echobit API Worker — serves the Vue SPA (static assets, SPA fallback) and
// the /api routes (run_worker_first), plus the async pipeline queue consumer.

import { Hono } from 'hono';
import authRoutes from './routes/auth.ts';
import recordingsRoutes from './routes/recordings.ts';
import paymentsRoutes from './routes/payments.ts';
import adminRoutes from './routes/admin.ts';
import plansRoutes from './routes/plans.ts';
import { authenticateToken } from './middleware/auth.ts';
import { getUserById, updateRow } from './lib/db.ts';
import { logError } from './lib/log-error.ts';
import { r2AudioSource, transcribeAudio } from './audio/pipeline.ts';
import { generateTitle } from './audio/gemini.ts';
import type { Env, HonoEnv, JobMessage, RecordingRow } from './types.ts';

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
    } else if (!origin) {
      res.headers.set('Access-Control-Allow-Origin', '*');
    }
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.headers.set(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
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

// Public routes
app.route('/api/auth', authRoutes);
app.route('/api/plans', plansRoutes);

// Protected routes (recordings router mounted behind auth — server.js parity)
app.use('/api/recordings/*', authenticateToken);
app.route('/api/recordings', recordingsRoutes);
app.route('/api/payments', paymentsRoutes);
app.route('/api/admin', adminRoutes);

// Health check
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

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error(err.stack ?? err.message);
  return c.json({ error: 'Something went wrong!' }, 500);
});

// ─── Queue consumer: async transcription jobs (+ DLQ) ───────────────────────

const TEMP_PREFIX = 'uploads/tmp/';

const runTranscriptionJob = async (env: Env, job: JobMessage): Promise<void> => {
  const recording = await env.DB.prepare('SELECT * FROM recordings WHERE id = ?')
    .bind(job.recordingId)
    .first<RecordingRow>();
  if (!recording || !recording.audio_key) {
    console.warn('[queue] Recording gone or has no audio, skipping:', job.recordingId);
    return;
  }

  const userRow = await getUserById(env, job.userId);
  const source = await r2AudioSource(env, recording.audio_key);
  if (!source) throw new Error(`Audio object not found: ${recording.audio_key}`);

  const result = await transcribeAudio(env, source, recording.audio_mime_type, userRow);

  // tempUpload (cloudSync off): audio was only staged for processing
  const isTemp = recording.audio_key.startsWith(TEMP_PREFIX);
  if (isTemp) await env.BUCKET.delete(recording.audio_key).catch(() => {});

  let title: string | undefined;
  if (/^Recording \d/.test(recording.title) && result.text.length > 20 && env.GEMINI_API_KEY) {
    title = await generateTitle(env, result.text).catch(() => undefined);
  }

  await updateRow(env, 'recordings', recording.id, {
    transcript: result.text,
    duration: Math.round(result.duration || recording.duration),
    status: 'transcribed',
    title,
    audio_key: isTemp ? null : undefined,
    audio_url: isTemp ? null : undefined,
  });
};

export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    if (batch.queue.endsWith('-dlq')) {
      // Permanently failed jobs: mark recording failed + log for admin
      for (const msg of batch.messages) {
        const job = msg.body;
        await updateRow(env, 'recordings', job.recordingId, { status: 'failed' });
        await logError(env, 'transcription_failed', 'Job exhausted retries (DLQ)', {
          userId: job.userId,
          recordingId: job.recordingId,
          meta: { task: job.task },
        });
        msg.ack();
      }
      return;
    }

    for (const msg of batch.messages) {
      try {
        await runTranscriptionJob(env, msg.body);
        msg.ack();
      } catch (err) {
        console.error('[queue] Job failed:', (err as Error).message);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env, JobMessage>;
