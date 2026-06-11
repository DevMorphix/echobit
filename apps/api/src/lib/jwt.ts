// HS256 JWTs with the SAME secret and claims ({id, email, name}, 7-day expiry)
// as the old backend (backend/middleware/auth.js) so sessions issued before
// the migration keep working.

import { sign, verify } from 'hono/jwt';
import type { AuthUser } from '../types.ts';

export const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export const generateToken = async (
  secret: string,
  user: { id: string; email: string; name: string },
): Promise<{ token: string; expiresAt: number }> => {
  const nowSecs = Math.floor(Date.now() / 1000);
  const token = await sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      iat: nowSecs,
      exp: nowSecs + TOKEN_EXPIRY_SECONDS,
    },
    secret,
    'HS256',
  );
  return { token, expiresAt: Date.now() + TOKEN_EXPIRY_SECONDS * 1000 };
};

export const verifyToken = async (secret: string, token: string): Promise<AuthUser | null> => {
  try {
    const payload = await verify(token, secret, 'HS256');
    if (typeof payload.id !== 'string') return null;
    return {
      id: payload.id,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
    };
  } catch {
    return null;
  }
};
