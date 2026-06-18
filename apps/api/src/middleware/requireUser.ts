import { createMiddleware } from 'hono/factory';
import { verifyToken } from '../lib/jwt.ts';
import { createAuth } from '../auth/betterAuth.ts';
import type { HonoEnv } from '../types.ts';

// Accepts either a Better Auth session (web, cookie/bearer) or a legacy JWT
// (the published mobile app) so both clients work during the migration.
export const requireUser = createMiddleware<HonoEnv>(async (c, next) => {
  try {
    const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
    if (session?.user) {
      c.set('user', { id: session.user.id, email: session.user.email, name: session.user.name ?? '' });
      return next();
    }
  } catch { /* fall back to legacy token */ }

  const token = c.req.header('authorization')?.split(' ')[1];
  if (!token) return c.json({ error: 'Access token required' }, 401);

  const user = await verifyToken(c.env.JWT_SECRET, token);
  if (!user) return c.json({ error: 'Invalid or expired token' }, 403);

  c.set('user', user);
  await next();
});
