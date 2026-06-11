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

export const requireAdmin = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return c.json({ error: 'Access token required' }, 401);

  const decoded = await verifyToken(c.env.JWT_SECRET, token);
  if (!decoded) return c.json({ error: 'Invalid or expired token' }, 403);

  const row = await c.env.DB.prepare('SELECT role FROM users WHERE id = ?')
    .bind(decoded.id)
    .first<{ role: string }>();
  if (!row || row.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  c.set('user', decoded);
  await next();
});
