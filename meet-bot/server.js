// Meeting bot control server (standalone — runs dockerized on a VM, reached by
// the MeetingBot Durable Object over a Cloudflare Tunnel). Handles MANY
// concurrent Google Meet recordings: every session gets its own headful
// Chromium (Playwright), a dedicated PulseAudio null sink for audio isolation,
// and an ffmpeg capture to a 16 kHz mono WAV. The DO drives it over HTTP,
// keyed by a per-session id and authed with a shared bearer token:
//   POST /join    { id, meetingUrl, botName, maxDurationSecs, storageState } → ack
//   GET  /status?id=                                          → { state, durationSecs, error }
//   GET  /audio?id=                                           → WAV stream
//   POST /stop?id=                                            → ends + reaps the session
//   GET  /debug?id=                                           → last failure screenshot

import http from 'node:http';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import { chromium } from 'playwright';

const execFileP = promisify(execFile);

const PORT = 8080;
const AUTH_TOKEN = process.env.MEET_BOT_SECRET || '';
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS) || 6;
const DISPLAY = process.env.DISPLAY || ':99';
const DONE_TTL_MS = 30 * 60_000; // evict finished sessions this long after they end (disk/sink safety)
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const ACTIVE = ['joining', 'waiting', 'recording'];
const outPath = (id) => `/tmp/out-${id}.wav`;
const shotPath = (id) => `/tmp/fail-${id}.png`;

/** sessionId → session. One live Chromium + ffmpeg + PulseAudio sink each. */
const sessions = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const timeoutReject = (ms, msg) => new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
const countActive = () => [...sessions.values()].filter((s) => ACTIVE.includes(s.phase)).length;

const pageText = async (page) => {
  try {
    return (await page.locator('body').innerText({ timeout: 2000 })).replace(/\s+/g, ' ').slice(0, 400);
  } catch {
    return '';
  }
};

const dismissDialogs = async (page) => {
  for (const re of [/^Got it$/i, /^I agree$/i, /^Accept all$/i, /^Dismiss$/i, /^No thanks$/i]) {
    await page.getByRole('button', { name: re }).first().click({ timeout: 1500 }).catch(() => {});
  }
};

// ── PulseAudio: one null sink per session so each Chromium's audio is captured
// in isolation. start.sh disables stream-restore device memory so PULSE_SINK is
// always honored and Chrome can't drift onto the wrong sink (would cross-mix).
const loadSink = async (session) => {
  const { stdout } = await execFileP('pactl', [
    'load-module', 'module-null-sink',
    `sink_name=${session.sinkName}`,
    `sink_properties=device.description=${session.sinkName}`,
  ]);
  session.sinkModule = stdout.trim();
};

const unloadSink = async (session) => {
  if (!session.sinkModule) return;
  const mod = session.sinkModule;
  session.sinkModule = null;
  await execFileP('pactl', ['unload-module', mod]).catch(() => {});
};

const joinMeeting = async (session, meetingUrl, botName, storageState) => {
  console.log(`[${session.id}] launching browser`);
  // PULSE_SINK pins this browser's audio output to its own sink; DISPLAY is the
  // shared Xvfb (many headful Chromium windows on one X display is fine).
  session.browser = await chromium.launch({
    headless: false,
    env: { ...process.env, DISPLAY, PULSE_SINK: session.sinkName },
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  const contextOpts = { userAgent: UA, permissions: ['microphone', 'camera'], locale: 'en-US' };
  // Signed-in bot session (a dedicated Google account's cookies) lets the bot
  // join meetings that require sign-in. Absent → guest join.
  if (storageState) {
    try { contextOpts.storageState = JSON.parse(storageState); } catch { /* fall back to guest */ }
  }
  const context = await session.browser.newContext(contextOpts);
  const page = await context.newPage();
  console.log(`[${session.id}] browser up (signed-in=${!!contextOpts.storageState}); opening ${meetingUrl}`);
  await page.goto(meetingUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(4000);
  await dismissDialogs(page);
  console.log(`[${session.id}] page loaded: ${page.url()}`);

  // A signed-out bot can't join meetings that require a Google account.
  const body = await pageText(page);
  if (/sign in|you can.?t join|not allowed|check your meeting code/i.test(body)) {
    throw new Error(`Meet blocked the bot at ${page.url()} — "${body.slice(0, 160)}"`);
  }

  const nameInput = page.getByRole('textbox', { name: /your name/i });
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(botName);
  }

  for (const re of [/turn off microphone/i, /turn off camera/i]) {
    await page.getByRole('button', { name: re }).first().click({ timeout: 1500 }).catch(() => {});
  }

  console.log(`[${session.id}] clicking join`);
  const joinBtn = page.getByRole('button', { name: /join now|ask to join|join anyway/i });
  await joinBtn.first().click({ timeout: 30_000 });

  session.phase = 'waiting';
  console.log(`[${session.id}] clicked join — waiting to be admitted`);
  await page.getByRole('button', { name: /leave call/i }).first().waitFor({ timeout: 5 * 60_000 });
  console.log(`[${session.id}] in call — recording`);
  return page;
};

const startRecording = (session) => {
  session.ffmpeg = spawn('ffmpeg', [
    '-y', '-f', 'pulse', '-i', `${session.sinkName}.monitor`,
    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', outPath(session.id),
  ], { stdio: ['pipe', 'ignore', 'ignore'] });
  session.phase = 'recording';
  session.startedAt = Date.now();
};

const stopRecording = async (session) => {
  if (session.ffmpeg && !session.ffmpeg.killed) {
    try { session.ffmpeg.stdin.write('q'); } catch { /* gone */ }
    await new Promise((r) => { session.ffmpeg.on('exit', r); setTimeout(r, 5000); });
  }
  if (session.startedAt && !session.durationSecs) {
    session.durationSecs = Math.round((Date.now() - session.startedAt) / 1000);
  }
};

const run = async (session, meetingUrl, botName, maxDurationSecs, storageState) => {
  try {
    await loadSink(session);
    // A hang (e.g. Chromium never loading) must surface as an error with page
    // diagnostics rather than sitting in "joining" forever.
    const page = await Promise.race([
      joinMeeting(session, meetingUrl, botName, storageState),
      timeoutReject(180_000, 'Timed out before joining the call (180s)'),
    ]);
    startRecording(session);

    const deadline = Date.now() + maxDurationSecs * 1000;
    while (!session.stopRequested && Date.now() < deadline) {
      const ended = await page.getByText(/You.ve left|removed from the meeting|Return to home screen/i).first().isVisible().catch(() => false);
      const inCall = await page.getByRole('button', { name: /leave call/i }).first().isVisible().catch(() => false);
      if (ended || !inCall) break;
      await sleep(5000);
    }

    await stopRecording(session);
    if (session.phase !== 'error') session.phase = 'done';
  } catch (e) {
    let diag = '';
    try {
      const p = session.browser?.contexts()[0]?.pages()[0];
      if (p) {
        await p.screenshot({ path: shotPath(session.id) }).catch(() => {});
        diag = ` [page: ${p.url()}] ${await pageText(p)}`;
      }
    } catch { /* diagnostics are best-effort */ }
    session.error = `${(e && e.message) || e}${diag}`;
    session.phase = 'error';
    console.error(`[${session.id}] join failed:`, session.error);
    await stopRecording(session).catch(() => {});
  } finally {
    // Free CPU + the audio device promptly; keep the WAV on disk until the DO
    // pulls /audio and then /stop (or the TTL sweep) reaps the session.
    await session.browser?.close().catch(() => {});
    session.browser = null;
    await unloadSink(session);
    session.doneAt = Date.now();
  }
};

// Full teardown — kill everything, drop the WAV, free the slot. Idempotent so
// /stop, the run() cleanup, and the TTL sweep can't fight each other.
const destroySession = async (session) => {
  if (session.destroyed) return;
  session.destroyed = true;
  session.stopRequested = true;
  if (session.ffmpeg && !session.ffmpeg.killed) { try { session.ffmpeg.kill('SIGKILL'); } catch { /* gone */ } }
  await session.browser?.close().catch(() => {});
  session.browser = null;
  await unloadSink(session);
  for (const p of [outPath(session.id), shotPath(session.id)]) { try { fs.unlinkSync(p); } catch { /* not there */ } }
  sessions.delete(session.id);
};

const createSession = (id) => ({
  id,
  phase: 'joining', // joining | waiting | recording | done | error
  error: null,
  startedAt: 0,
  durationSecs: 0,
  doneAt: 0,
  browser: null,
  ffmpeg: null,
  stopRequested: false,
  destroyed: false,
  sinkName: `meetsink_${id.replace(/[^a-zA-Z0-9_]/g, '')}`,
  sinkModule: null,
});

// Reap finished sessions a crashed/forgotten DO never came back to /stop.
setInterval(() => {
  const now = Date.now();
  for (const s of sessions.values()) {
    if (!ACTIVE.includes(s.phase) && s.doneAt && now - s.doneAt > DONE_TTL_MS) {
      destroySession(s).catch(() => {});
    }
  }
}, 60_000).unref();

const readJson = (req) => new Promise((resolve) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
});

const authed = (req) => {
  if (!AUTH_TOKEN) return true; // unset = open (local dev only)
  return (req.headers.authorization || '') === `Bearer ${AUTH_TOKEN}`;
};

const sendJson = (res, status, obj) =>
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(obj));

const server = http.createServer(async (req, res) => {
  if (!authed(req)) { res.writeHead(401).end('unauthorized'); return; }
  const url = new URL(req.url, 'http://meet');

  if (req.method === 'POST' && url.pathname === '/join') {
    const { id, meetingUrl, botName, maxDurationSecs, storageState } = await readJson(req);
    if (!id) { res.writeHead(400).end('id required'); return; }
    if (!meetingUrl) { res.writeHead(400).end('meetingUrl required'); return; }

    const existing = sessions.get(id);
    // Idempotent: a re-sent /join for an already-running session is an ack, not
    // a conflict (handles a lost 202 without the DO giving up).
    if (existing && ACTIVE.includes(existing.phase)) { sendJson(res, 202, { ok: true, alreadyActive: true }); return; }
    if (existing) await destroySession(existing); // recycle a lingering done/error id
    if (countActive() >= MAX_SESSIONS) { res.writeHead(503).end('at capacity'); return; }

    const session = createSession(id);
    sessions.set(id, session);
    run(session, meetingUrl, botName || 'Echobit Notetaker', Number(maxDurationSecs) || 10_800, storageState);
    sendJson(res, 202, { ok: true });
    return;
  }

  const id = url.searchParams.get('id');
  if (!id) { res.writeHead(400).end('id required'); return; }
  const session = sessions.get(id);

  if (req.method === 'GET' && url.pathname === '/status') {
    // Unknown id → the bot restarted and lost the session; report it as a
    // terminal error so the DO fails fast instead of polling forever.
    if (!session) { sendJson(res, 200, { state: 'error', durationSecs: 0, error: 'session not found (bot restarted?)' }); return; }
    const live = session.phase === 'recording' && session.startedAt
      ? Math.round((Date.now() - session.startedAt) / 1000)
      : session.durationSecs;
    sendJson(res, 200, { state: session.phase, durationSecs: live, error: session.error });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/audio') {
    if (!session || !fs.existsSync(outPath(id))) { res.writeHead(404).end('no audio'); return; }
    res.writeHead(200, { 'content-type': 'audio/wav' });
    fs.createReadStream(outPath(id)).pipe(res);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/debug') {
    if (!fs.existsSync(shotPath(id))) { res.writeHead(404).end('no screenshot'); return; }
    res.writeHead(200, { 'content-type': 'image/png' });
    fs.createReadStream(shotPath(id)).pipe(res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/stop') {
    if (session) await destroySession(session);
    sendJson(res, 200, { ok: true });
    return;
  }

  res.writeHead(404).end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`meet-bot control server on :${PORT} (max ${MAX_SESSIONS} concurrent)`);
  if (!AUTH_TOKEN) console.warn('[meet-bot] MEET_BOT_SECRET unset — auth is OPEN (dev only)');
});
