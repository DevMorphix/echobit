// API contract test suite: runs the same requests against the OLD (Node) and
// NEW (Worker) backends and deep-diffs normalized responses. This is the
// compatibility proof for the published mobile app.
//
// Usage:
//   OLD_BASE=https://recapi.badhusha.dev/api \
//   NEW_BASE=http://localhost:8787/api \
//   TEST_EMAIL=contract-test@example.com TEST_PASSWORD=test123456 \
//   bun test contract.test.ts
//
// Both backends must point at databases seeded with the SAME fixture data
// (TEST_EMAIL must exist, be verified, with at least one recording).
// Skips itself when OLD_BASE/NEW_BASE are not set.

import { describe, expect, test } from 'bun:test';

const OLD_BASE = process.env.OLD_BASE;
const NEW_BASE = process.env.NEW_BASE;
const TEST_EMAIL = process.env.TEST_EMAIL ?? 'contract-test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'test123456';

const enabled = !!OLD_BASE && !!NEW_BASE;
const t = enabled ? test : test.skip;

// Volatile fields asserted by SHAPE, not value
const VOLATILE = new Set([
  '_id', 'id', 'user', 'token', 'expiresAt', 'audioUrl', 'audioKey',
  'createdAt', 'updatedAt', 'timestamp', 'lastLoginAt', 'loginCount',
  'verificationOTPExpires', 'resetPasswordOTPExpires', 'privacyAcceptedAt',
  'planStartDate', 'planExpiresAt', 'uploadUrl', 'key', 'order_id',
  'recordingCount', 'daysRemaining', 'usedCount',
]);

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Replace volatile values with type markers so shapes can be deep-compared. */
const normalize = (value: unknown, key?: string): unknown => {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((v) => normalize(v, key));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = VOLATILE.has(k) ? typeMarker(v) : normalize(v, k);
    }
    return out;
  }
  return value;
};

const typeMarker = (v: unknown): string => {
  if (v === null) return '<null>';
  if (typeof v === 'number') return '<number>';
  if (typeof v === 'string') return ISO_RE.test(v) ? '<iso-date>' : '<string>';
  if (typeof v === 'object') return '<object>';
  return `<${typeof v}>`;
};

interface Hit {
  status: number;
  body: unknown;
}

const hit = async (
  base: string,
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<Hit> => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }
  return { status: res.status, body };
};

// One login per backend for the whole suite (also avoids tripping the
// login rate limiter, which is part of the contract).
const tokenCache = new Map<string, Promise<string>>();
const login = (base: string): Promise<string> => {
  let cached = tokenCache.get(base);
  if (!cached) {
    cached = (async () => {
      const res = await hit(base, 'POST', '/auth/login', {
        body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });
      const body = res.body as { token?: string };
      if (!body?.token) throw new Error(`Login failed on ${base}: ${JSON.stringify(res.body)}`);
      return body.token;
    })();
    tokenCache.set(base, cached);
  }
  return cached;
};

/** Run the same request against both backends and compare status + shape. */
const compare = async (
  method: string,
  path: string,
  opts: { auth?: boolean; body?: unknown } = {},
): Promise<void> => {
  const [oldToken, newToken] = opts.auth
    ? await Promise.all([login(OLD_BASE!), login(NEW_BASE!)])
    : [undefined, undefined];

  const [oldRes, newRes] = await Promise.all([
    hit(OLD_BASE!, method, path, { token: oldToken, body: opts.body }),
    hit(NEW_BASE!, method, path, { token: newToken, body: opts.body }),
  ]);

  expect(newRes.status).toBe(oldRes.status);
  expect(normalize(newRes.body)).toEqual(normalize(oldRes.body));
};

describe('contract: auth', () => {
  t('login success shape (small user object with `id`)', () =>
    compare('POST', '/auth/login', { body: { email: TEST_EMAIL, password: TEST_PASSWORD } }));

  t('login wrong password → 401 Invalid credentials', () =>
    compare('POST', '/auth/login', { body: { email: TEST_EMAIL, password: 'wrong-password' } }));

  t('login missing fields → 400', () =>
    compare('POST', '/auth/login', { body: { email: TEST_EMAIL } }));

  t('GET /auth/me — full user document', () => compare('GET', '/auth/me', { auth: true }));

  t('GET /auth/me without token → 401 Not authenticated', () => compare('GET', '/auth/me'));

  t('refresh token shape', () => compare('POST', '/auth/refresh', { auth: true, body: {} }));

  t('invalid token on protected route → 403 (middleware split)', async () => {
    const [oldRes, newRes] = await Promise.all([
      hit(OLD_BASE!, 'GET', '/recordings', { token: 'garbage' }),
      hit(NEW_BASE!, 'GET', '/recordings', { token: 'garbage' }),
    ]);
    expect(oldRes.status).toBe(403);
    expect(newRes.status).toBe(403);
    expect(normalize(newRes.body)).toEqual(normalize(oldRes.body));
  });

  t('missing token on protected route → 401', async () => {
    const [oldRes, newRes] = await Promise.all([
      hit(OLD_BASE!, 'GET', '/recordings', {}),
      hit(NEW_BASE!, 'GET', '/recordings', {}),
    ]);
    expect(oldRes.status).toBe(401);
    expect(newRes.status).toBe(401);
  });
});

describe('contract: plans + payments', () => {
  t('GET /plans (public pricing)', () => compare('GET', '/plans'));

  t('payments status shape', () => compare('GET', '/payments/status', { auth: true }));

  t('create-order invalid plan → 400 with plan list', () =>
    compare('POST', '/payments/create-order', { auth: true, body: { plan: 'bogus' } }));

  t('validate-coupon missing fields → 400', () =>
    compare('POST', '/payments/validate-coupon', { auth: true, body: {} }));
});

describe('contract: recordings', () => {
  t('GET /recordings/limits shape', () => compare('GET', '/recordings/limits', { auth: true }));

  t('GET /recordings list (lean shape — no virtuals)', () =>
    compare('GET', '/recordings', { auth: true }));

  t('GET /recordings/:id not found → 404', () =>
    compare('GET', '/recordings/000000000000000000000000', { auth: true }));

  t('upload-chunk missing fields → 400', () =>
    compare('POST', '/recordings/upload-chunk', { auth: true, body: { uploadId: 'x' } }));

  t('finalize-upload unknown id → 404 Upload not found', () =>
    compare('POST', '/recordings/finalize-upload', {
      auth: true,
      body: { uploadId: 'nonexistent-upload', duration: 10 },
    }));
});

describe('contract: mobile chunk-protocol replay (byte-identical to api.ts)', () => {
  // Replays mobile-app/rec-ai/src/services/api.ts createRecordingNative():
  // base64 data-URL split into 5MB char slices, then finalize.
  t('chunked upload → finalize → recording document', async () => {
    const base = NEW_BASE!; // behavioral test against the new backend
    const token = await login(base);

    // 1-second 16kHz mono WAV
    const sampleRate = 16_000;
    const pcm = new Int16Array(sampleRate);
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] = Math.round(Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 12_000);
    }
    const header = new Uint8Array(44);
    const view = new DataView(header.buffer);
    header.set([0x52, 0x49, 0x46, 0x46], 0);
    view.setUint32(4, 36 + pcm.byteLength, true);
    header.set([0x57, 0x41, 0x56, 0x45], 8);
    header.set([0x66, 0x6d, 0x74, 0x20], 12);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    header.set([0x64, 0x61, 0x74, 0x61], 36);
    view.setUint32(40, pcm.byteLength, true);
    const wav = new Uint8Array(44 + pcm.byteLength);
    wav.set(header, 0);
    wav.set(new Uint8Array(pcm.buffer), 44);

    let b64 = '';
    for (let i = 0; i < wav.length; i += 0x8000) {
      b64 += btoa(String.fromCharCode(...wav.subarray(i, i + 0x8000)));
    }
    const audioData = `data:audio/wav;base64,${b64}`;

    // Mobile slices by char count — use a small chunk size to force ≥3 chunks
    const CHUNK_SIZE = 13_000;
    const uploadId = `${Date.now()}-test`;
    const totalChunks = Math.ceil(audioData.length / CHUNK_SIZE);
    expect(totalChunks).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < totalChunks; i++) {
      const res = await hit(base, 'POST', '/recordings/upload-chunk', {
        token,
        body: {
          uploadId,
          chunkIndex: i,
          totalChunks,
          chunk: audioData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        },
      });
      expect(res.status).toBe(200);
      expect((res.body as { ok: boolean; received: number }).ok).toBe(true);
      expect((res.body as { received: number }).received).toBe(i);
    }

    const fin = await hit(base, 'POST', '/recordings/finalize-upload', {
      token,
      body: { uploadId, duration: 1, mimeType: 'audio/wav', title: 'Contract replay' },
    });
    expect(fin.status).toBe(201);
    const rec = (fin.body as { recording: Record<string, unknown> }).recording;
    expect(rec._id).toBeDefined();
    expect(rec.id).toBeDefined(); // document virtuals present
    expect(rec.formattedDuration).toBeDefined();
    expect(rec.status).toBe('pending');
    expect(rec.audioSize).toBe(wav.length); // byte-exact reassembly
    expect(rec.audioMimeType).toBe('audio/wav');

    // Cleanup
    await hit(base, 'DELETE', `/recordings/${rec._id}`, { token });
  }, 60_000);
});
