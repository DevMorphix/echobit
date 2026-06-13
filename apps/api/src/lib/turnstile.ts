// Turnstile bot protection for the OTP-sending auth endpoints.
//
// Enforcement is deliberately scoped: a token is required only when BOTH
// - TURNSTILE_SECRET is configured, and
// - the request carries a browser Origin from ALLOWED_ORIGINS (the web app).
// The published mobile app sends a Capacitor origin (or none) and stays
// exempt until an app release ships the widget; IP rate limits still cover it.

import type { Env } from '../types.ts';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const turnstileRequired = (env: Env, origin: string | undefined): boolean => {
  if (!env.TURNSTILE_SECRET || !origin) return false;
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return allowed.includes(origin);
};

export const verifyTurnstile = async (
  env: Env,
  token: string | undefined,
  ip: string,
): Promise<boolean> => {
  if (!token) return false;
  try {
    const res = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    // Fail open: a siteverify outage must not lock users out of signup —
    // the IP rate limits remain as the backstop.
    return true;
  }
};
