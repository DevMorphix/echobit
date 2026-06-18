// Auth middleware with the EXACT status-code semantics of the old backend
// (backend/middleware/auth.js): 401 = missing token, 403 = invalid/expired.
// The published mobile app logs out on both, but the split is contract.

import { createMiddleware } from 'hono/factory';
import { verifyToken } from '../lib/jwt.ts';
import type { HonoEnv } from '../types.ts';

export const authenticateToken = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return c.json({ error: 'Access token required' }, 401);
  }

  const user = await verifyToken(c.env.JWT_SECRET, token);
  if (!user) {
    return c.json({ error: 'Invalid or expired token' }, 403);
  }

  c.set('user', user);
  await next();
});

// Admin authorization is no longer an in-app role check — the admin surface is
// gated by Cloudflare Access. See middleware/cfAccess.ts (requireCfAccess).
