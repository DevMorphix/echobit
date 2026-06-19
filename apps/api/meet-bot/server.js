// Meeting bot control server (runs inside the Cloudflare Container).
// Joins a Google Meet with Chromium (Playwright, headful under Xvfb), routes the
// call audio into a PulseAudio null sink, and records it to a 16 kHz mono WAV
// with ffmpeg. The MeetingBot Durable Object polls /status and pulls /audio.

import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from 'playwright';

const PORT = 8080;
const OUT_PATH = '/tmp/out.wav';
const SHOT_PATH = '/tmp/fail.png';
const PULSE_MONITOR = 'meetsink.monitor';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const state = {
  phase: 'idle', // idle | joining | waiting | recording | done | error
  error: null,
  startedAt: 0,
  durationSecs: 0,
};

let browser = null;
let ffmpeg = null;
let stopRequested = false;

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

const joinMeeting = async (meetingUrl, botName) => {
  browser = await chromium.launch({
    headless: false,
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
  const context = await browser.newContext({
    userAgent: UA,
    permissions: ['microphone', 'camera'],
    locale: 'en-US',
  });
  const page = await context.newPage();
  await page.goto(meetingUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(4000);
  await dismissDialogs(page);

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

  const joinBtn = page.getByRole('button', { name: /join now|ask to join|join anyway/i });
  await joinBtn.first().click({ timeout: 30_000 });

  state.phase = 'waiting';
  await page.getByRole('button', { name: /leave call/i }).first().waitFor({ timeout: 5 * 60_000 });
  return page;
};

const startRecording = () => {
  ffmpeg = spawn('ffmpeg', [
    '-y', '-f', 'pulse', '-i', PULSE_MONITOR,
    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', OUT_PATH,
  ], { stdio: ['pipe', 'ignore', 'ignore'] });
  state.phase = 'recording';
  state.startedAt = Date.now();
};

const stopRecording = async () => {
  if (ffmpeg && !ffmpeg.killed) {
    try { ffmpeg.stdin.write('q'); } catch { /* gone */ }
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
      const ended = await page.getByText(/You.ve left|removed from the meeting|Return to home screen/i).first().isVisible().catch(() => false);
      const inCall = await page.getByRole('button', { name: /leave call/i }).first().isVisible().catch(() => false);
      if (ended || !inCall) break;
      await new Promise((r) => setTimeout(r, 5000));
    }

    await stopRecording();
    state.phase = 'done';
  } catch (e) {
    let diag = '';
    try {
      const p = browser?.contexts()[0]?.pages()[0];
      if (p) {
        await p.screenshot({ path: SHOT_PATH }).catch(() => {});
        diag = ` [page: ${p.url()}] ${await pageText(p)}`;
      }
    } catch { /* diagnostics are best-effort */ }
    state.error = `${(e && e.message) || e}${diag}`;
    state.phase = 'error';
    console.error('[meet-bot] join failed:', state.error);
    await stopRecording().catch(() => {});
  } finally {
    await browser?.close().catch(() => {});
    browser = null;
  }
};

const readJson = (req) => new Promise((resolve) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://meet');

  if (req.method === 'POST' && url.pathname === '/join') {
    if (state.phase !== 'idle') { res.writeHead(409).end('already active'); return; }
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

  if (req.method === 'GET' && url.pathname === '/debug') {
    if (!fs.existsSync(SHOT_PATH)) { res.writeHead(404).end('no screenshot'); return; }
    res.writeHead(200, { 'content-type': 'image/png' });
    fs.createReadStream(SHOT_PATH).pipe(res);
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
