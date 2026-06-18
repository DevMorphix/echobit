// Meeting bot control server (runs inside the Cloudflare Container).
//
// Joins a Google Meet with a headless Chromium (Playwright), lets Chromium play
// the call audio into a PulseAudio null sink (set up in start.sh), and records
// that sink's monitor to a 16 kHz mono WAV with ffmpeg. The MeetingBot Durable
// Object polls /status and pulls /audio when the call ends.
//
// SPIKE NOTE: the Google Meet join selectors and the WebRTC media path (UDP vs
// Meet's TCP/443 fallback from inside Container egress) are the parts the
// Phase-0 spike must validate. Selectors are intentionally isolated below.

import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from 'playwright';

const PORT = 8080;
const OUT_PATH = '/tmp/out.wav';
const PULSE_MONITOR = 'meetsink.monitor';

const state = {
  phase: 'idle', // idle | joining | waiting | recording | done | error
  error: null,
  startedAt: 0,
  durationSecs: 0,
};

let browser = null;
let ffmpeg = null;
let stopRequested = false;

// ─── Meet automation (the brittle, spike-validated part) ─────────────────────

const SEL = {
  nameInput: 'input[aria-label="Your name"], input[placeholder="Your name"]',
  joinButton: 'button:has-text("Ask to join"), button:has-text("Join now")',
  inCall: '[aria-label*="Leave call"], button[aria-label*="Leave call"]',
  waiting: 'text=/Asking to be let in|You.ll join when someone lets you in/i',
  ended: 'text=/You.ve left the meeting|removed from the meeting|Return to home screen/i',
};

const joinMeeting = async (meetingUrl, botName) => {
  browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream', // auto-accept the mic/cam permission prompt
      '--use-fake-device-for-media-stream', // no real devices in the container
      '--autoplay-policy=no-user-gesture-required',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  const context = await browser.newContext({ permissions: ['microphone', 'camera'] });
  const page = await context.newPage();
  await page.goto(meetingUrl, { waitUntil: 'networkidle', timeout: 60_000 });

  // Guest name (when not signed in)
  const nameInput = page.locator(SEL.nameInput).first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(botName);
  }

  // Best-effort: turn the bot's own mic/cam off before joining
  for (const label of ['Turn off microphone', 'Turn off camera']) {
    await page.locator(`[aria-label*="${label}"]`).first().click({ timeout: 2000 }).catch(() => {});
  }

  await page.locator(SEL.joinButton).first().click({ timeout: 30_000 });

  // Either we land in the call or we wait in the lobby for admission.
  state.phase = 'waiting';
  await page.waitForSelector(SEL.inCall, { timeout: 5 * 60_000 });
  return page;
};

const startRecording = () => {
  ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'pulse', '-i', PULSE_MONITOR,
    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
    OUT_PATH,
  ], { stdio: ['pipe', 'ignore', 'ignore'] });
  state.phase = 'recording';
  state.startedAt = Date.now();
};

const stopRecording = async () => {
  if (ffmpeg && !ffmpeg.killed) {
    // 'q' lets ffmpeg finalize the WAV header (vs SIGKILL truncating it)
    try { ffmpeg.stdin.write('q'); } catch { /* already gone */ }
    await new Promise((r) => { ffmpeg.on('exit', r); setTimeout(r, 5000); });
  }
  if (state.startedAt) state.durationSecs = Math.round((Date.now() - state.startedAt) / 1000);
};

const run = async (meetingUrl, botName, maxDurationSecs) => {
  try {
    const page = await joinMeeting(meetingUrl, botName);
    startRecording();

    const deadline = Date.now() + maxDurationSecs * 1000;
    while (!stopRequested && Date.now() < deadline) {
      // Call ended (kicked, everyone left, or meeting closed)?
      if (await page.locator(SEL.ended).first().isVisible().catch(() => false)) break;
      if (await page.locator(SEL.inCall).first().isVisible().catch(() => false) === false) break;
      await new Promise((r) => setTimeout(r, 5000));
    }

    await stopRecording();
    state.phase = 'done';
  } catch (e) {
    state.error = (e && e.message) ? e.message : String(e);
    state.phase = 'error';
    await stopRecording().catch(() => {});
  } finally {
    await browser?.close().catch(() => {});
    browser = null;
  }
};

// ─── Control API ─────────────────────────────────────────────────────────────

const readJson = (req) => new Promise((resolve) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://meet');

  if (req.method === 'POST' && url.pathname === '/join') {
    if (state.phase !== 'idle') {
      res.writeHead(409).end('already active');
      return;
    }
    const { meetingUrl, botName, maxDurationSecs } = await readJson(req);
    if (!meetingUrl) { res.writeHead(400).end('meetingUrl required'); return; }
    state.phase = 'joining';
    stopRequested = false;
    run(meetingUrl, botName || 'Echobit Notetaker', Number(maxDurationSecs) || 10_800);
    res.writeHead(202, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/status') {
    const live = state.phase === 'recording' && state.startedAt
      ? Math.round((Date.now() - state.startedAt) / 1000)
      : state.durationSecs;
    res.writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify({ state: state.phase, durationSecs: live, error: state.error }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/audio') {
    if (!fs.existsSync(OUT_PATH)) { res.writeHead(404).end('no audio'); return; }
    res.writeHead(200, { 'content-type': 'audio/wav' });
    fs.createReadStream(OUT_PATH).pipe(res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/stop') {
    stopRequested = true;
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404).end('not found');
});

server.listen(PORT, () => console.log(`meet-bot control server on :${PORT}`));
