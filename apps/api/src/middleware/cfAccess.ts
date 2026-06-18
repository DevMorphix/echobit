// Cloudflare Access (Zero Trust) gate for the admin surface. Replaces the old
// in-app `role === 'admin'` check: the admin panel (/admin) and /api/v1/admin/*
// sit behind an Access application, which authenticates the user at the edge and
// injects a signed `Cf-Access-Jwt-Assertion` JWT. We verify that JWT against the
// team's public keys here; the admin identity (email) comes from it.

import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Context } from 'hono';
import type { HonoEnv } from '../types.ts';

// createRemoteJWKSet caches keys (and refetches on rotation); reuse one per team.
type RemoteJwks = ReturnType<typeof createRemoteJWKSet>;
const jwksByTeam = new Map<string, RemoteJwks>();

const jwksFor = (teamDomain: string): RemoteJwks => {
  let jwks = jwksByTeam.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksByTeam.set(teamDomain, jwks);
  }
  return jwks;
};

// Access forwards its JWT in this header; also accept the CF_Authorization cookie
// (set on direct browser navigation) as a fallback.
const readAccessToken = (c: Context<HonoEnv>): string | undefined =>
  c.req.header('cf-access-jwt-assertion') ||
  c.req.header('cookie')?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];

const list = (csv?: string): string[] =>
  csv?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

export const requireCfAccess = createMiddleware<HonoEnv>(async (c, next) => {
  // Access never runs in front of `wrangler dev`; allow local admin work through.
  if (c.env.ENVIRONMENT === 'development') {
    c.set('adminEmail', 'dev@local');
    return next();
  }

  const teamDomain = c.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = list(c.env.CF_ACCESS_AUD);
  if (!teamDomain || aud.length === 0) {
    console.error('Cloudflare Access not configured (CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD).');
    return c.json({ error: 'Admin access is not configured' }, 503);
  }

  const token = readAccessToken(c);
  if (!token) return c.json({ error: 'Cloudflare Access required' }, 401);

  try {
    const { payload } = await jwtVerify(token, jwksFor(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });

    const email = typeof payload.email === 'string' ? payload.email : '';
    // Optional extra allowlist on top of the Access policy (empty = trust Access).
    const allow = list(c.env.ADMIN_EMAILS).map((e) => e.toLowerCase());
    if (allow.length && !allow.includes(email.toLowerCase())) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    c.set('adminEmail', email);
    await next();
  } catch (err) {
    console.error('Cloudflare Access verification failed:', err);
    return c.json({ error: 'Invalid Cloudflare Access token' }, 403);
  }
});
