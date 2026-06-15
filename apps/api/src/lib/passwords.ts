// Password/OTP hashing.
//
// Migrated rows hold bcrypt hashes (cost 12) — verified via bcryptjs (pure JS,
// CPU-heavy on Workers). On successful login we transparently rehash to
// PBKDF2-HMAC-SHA256 (native WebCrypto, <100ms), prefix-versioned so both
// formats coexist: "pbkdf2$<iterations>$<saltB64>$<hashB64>".

import bcrypt from 'bcryptjs';

const PBKDF2_ITERATIONS = 100_000;
const KEY_BYTES = 32;

const b64 = (buf: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf)));

const fromB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const pbkdf2 = async (plain: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
};

const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
};

export const hashPassword = async (plain: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(plain, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
};

export const verifyPassword = async (plain: string, stored: string): Promise<boolean> => {
  if (!stored) return false;
  if (stored.startsWith('pbkdf2$')) {
    const [, iterStr, saltB64, hashB64] = stored.split('$');
    if (!iterStr || !saltB64 || !hashB64) return false;
    const computed = await pbkdf2(plain, fromB64(saltB64), parseInt(iterStr, 10));
    return timingSafeEqual(computed, fromB64(hashB64));
  }
  // Legacy bcrypt hash (migrated from MongoDB)
  return bcrypt.compare(plain, stored);
};

/** True when a stored hash is legacy bcrypt and should be upgraded on login. */
export const needsRehash = (stored: string): boolean => !stored.startsWith('pbkdf2$');
