// Auth routes — exact contract port of backend/routes/auth.js.
// Pinned details: login/verify-email/google return a SMALL user object with
// `id` (not `_id`); /me and /profile return the full serialized user; /me uses
// 401 (not 403) for invalid tokens; login's 403 {error:'Email not verified',
// email} is mobile-flow-critical.

import { Hono } from 'hono';
import { newId } from '@echobit/shared/ids';
import { generateToken, verifyToken } from '../lib/jwt.ts';
import { hashPassword, verifyPassword, needsRehash } from '../lib/passwords.ts';
import { verifyGoogleIdToken } from '../lib/google.ts';
import { sendOTPEmail, sendDeletionRequestEmail, sendContactEmail } from '../lib/email.ts';
import { serializeUser } from '../lib/serialize.ts';
import { getUserByEmail, getUserById, nowIso, updateRow } from '../lib/db.ts';
import { deleteAudio } from '../lib/storage.ts';
import { parseBody, schemas } from '../lib/validate.ts';
import { turnstileRequired, verifyTurnstile } from '../lib/turnstile.ts';
import { authenticateToken } from '../middleware/auth.ts';
import type { Context } from 'hono';
import type { Env, HonoEnv, UserRow, RateLimitBinding } from '../types.ts';

const auth = new Hono<HonoEnv>();

const generateOTP = (): string => Math.floor(100000 + Math.random() * 900000).toString();

const clientIp = (c: { req: { header: (n: string) => string | undefined } }): string =>
  c.req.header('cf-connecting-ip') ?? 'unknown';

const rateLimit = async (limiter: RateLimitBinding | undefined, key: string): Promise<boolean> => {
  if (!limiter) return true; // binding absent in local dev
  try {
    const { success } = await limiter.limit({ key });
    return success;
  } catch {
    return true;
  }
};

/** Turnstile gate for OTP-sending endpoints (web-origin requests only). */
const turnstileBlocked = async (
  c: Context<HonoEnv>,
  token: string | undefined,
): Promise<boolean> => {
  if (!turnstileRequired(c.env, c.req.header('origin'))) return false;
  return !(await verifyTurnstile(c.env, token, clientIp(c)));
};

/** Small user payload used by login/verify-email/google (note `id`, not `_id`). */
const smallUser = (row: UserRow) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role || 'user',
  plan: row.plan || 'free',
  planExpiresAt: row.plan_expires_at || null,
  planBillingCycle: row.plan_billing_cycle || null,
});

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const insertUser = async (
  env: Env,
  fields: Partial<Record<keyof UserRow, string | number | null>> & {
    name: string;
    email: string;
    password: string;
  },
): Promise<UserRow> => {
  const ts = nowIso();
  const row: UserRow = {
    id: newId(),
    name: fields.name,
    email: fields.email.toLowerCase().trim(),
    password: fields.password,
    google_id: (fields.google_id as string) ?? null,
    avatar: null,
    is_active: 1,
    is_verified: (fields.is_verified as number) ?? 0,
    verification_otp: (fields.verification_otp as string) ?? null,
    verification_otp_expires: (fields.verification_otp_expires as string) ?? null,
    reset_password_otp: null,
    reset_password_otp_expires: null,
    privacy_accepted: 0,
    privacy_accepted_at: null,
    onboarding_seen: 0,
    role: 'user',
    last_login_at: (fields.last_login_at as string) ?? null,
    login_count: (fields.login_count as number) ?? 0,
    country: (fields.country as string) ?? null,
    profession: (fields.profession as string) ?? null,
    preferred_language: (fields.preferred_language as string) ?? null,
    summary_language: null,
    auto_save: 1,
    cloud_sync: 1,
    feature_overrides:
      '{"meetingMinutes":null,"actionItems":null,"pdfExport":null,"indianLanguages":null}',
    plan: 'free',
    plan_billing_cycle: null,
    plan_start_date: null,
    plan_expires_at: null,
    created_at: ts,
    updated_at: ts,
  };

  await env.DB.prepare(
    `INSERT INTO users (
      id, name, email, password, google_id, avatar, is_active, is_verified,
      verification_otp, verification_otp_expires, reset_password_otp, reset_password_otp_expires,
      privacy_accepted, privacy_accepted_at, onboarding_seen, role, last_login_at, login_count,
      country, profession, preferred_language, summary_language, auto_save, cloud_sync,
      feature_overrides, plan, plan_billing_cycle, plan_start_date, plan_expires_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id, row.name, row.email, row.password, row.google_id, row.avatar, row.is_active,
      row.is_verified, row.verification_otp, row.verification_otp_expires, row.reset_password_otp,
      row.reset_password_otp_expires, row.privacy_accepted, row.privacy_accepted_at,
      row.onboarding_seen, row.role, row.last_login_at, row.login_count, row.country,
      row.profession, row.preferred_language, row.summary_language, row.auto_save, row.cloud_sync,
      row.feature_overrides, row.plan, row.plan_billing_cycle, row.plan_start_date,
      row.plan_expires_at, row.created_at, row.updated_at,
    )
    .run();

  return row;
};

// Register
auth.post('/register', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.register);
    if (!body || !body.name || !body.email || !body.password) {
      return c.json({ error: 'All fields are required' }, 400);
    }
    if (await turnstileBlocked(c, body.turnstileToken)) {
      return c.json({ error: 'Verification failed. Please refresh and try again.' }, 403);
    }
    const { name, email, password, country, profession, preferredLanguage } = body;
    // Validation parity with the Mongoose schema messages
    if (name.trim().length < 2) {
      return c.json({ error: 'Name must be at least 2 characters' }, 400);
    }
    if (!EMAIL_RE.test(email)) {
      return c.json({ error: 'Please enter a valid email' }, 400);
    }
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    const existingUser = await getUserByEmail(c.env, email);
    if (existingUser) {
      return c.json({ error: 'User already exists with this email' }, 400);
    }

    const otp = generateOTP();
    const user = await insertUser(c.env, {
      name: name.trim(),
      email,
      password: await hashPassword(password),
      country: country || null,
      profession: profession || null,
      preferred_language: preferredLanguage || null,
      verification_otp: await hashPassword(otp),
      verification_otp_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    try {
      await sendOTPEmail(c.env, user.email, otp, 'verify');
    } catch (emailErr) {
      console.error('Failed to send verification email:', (emailErr as Error).message);
    }

    return c.json({ message: 'Account created. Please verify your email.', email: user.email }, 201);
  } catch (error) {
    console.error('Registration error:', (error as Error).message);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Login
auth.post('/login', async (c) => {
  if (!(await rateLimit(c.env.RL_LOGIN, clientIp(c)))) {
    return c.json({ error: 'Too many login attempts. Please try again in 15 minutes.' }, 429);
  }
  try {
    const body = await parseBody(c.req, schemas.login);
    if (!body || !body.email || !body.password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    const { email, password } = body;

    const user = await getUserByEmail(c.env, email);
    if (!user) return c.json({ error: 'Invalid credentials' }, 401);

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) return c.json({ error: 'Invalid credentials' }, 401);

    if (!user.is_verified) {
      return c.json({ error: 'Email not verified', email: user.email }, 403);
    }

    const updates: Record<string, string | number> = {
      last_login_at: nowIso(),
      login_count: (user.login_count || 0) + 1,
    };
    // Transparent upgrade: bcrypt (migrated) → PBKDF2 (native WebCrypto)
    if (needsRehash(user.password)) {
      updates.password = await hashPassword(password);
    }
    await updateRow(c.env, 'users', user.id, updates);

    const { token, expiresAt } = await generateToken(c.env.JWT_SECRET, user);
    return c.json({ message: 'Login successful', token, expiresAt, user: smallUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Send / Resend verification OTP
auth.post('/send-verification', async (c) => {
  if (!(await rateLimit(c.env.RL_OTP, clientIp(c)))) {
    return c.json({ error: 'Too many requests. Please try again in 15 minutes.' }, 429);
  }
  try {
    const body = await parseBody(c.req, schemas.emailOnly);
    const email = body?.email;
    if (!email) return c.json({ error: 'Email is required' }, 400);
    if (await turnstileBlocked(c, body?.turnstileToken)) {
      return c.json({ error: 'Verification failed. Please refresh and try again.' }, 403);
    }

    const user = await getUserByEmail(c.env, email);
    // Anti-enumeration: respond identically whether or not the account exists
    if (!user) return c.json({ message: 'Verification code sent' });
    if (user.is_verified) return c.json({ error: 'Email already verified' }, 400);

    const otp = generateOTP();
    await updateRow(c.env, 'users', user.id, {
      verification_otp: await hashPassword(otp),
      verification_otp_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    await sendOTPEmail(c.env, user.email, otp, 'verify');
    return c.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Send verification error:', error);
    return c.json({ error: 'Failed to send verification code' }, 500);
  }
});

// Verify email with OTP
auth.post('/verify-email', async (c) => {
  if (!(await rateLimit(c.env.RL_OTP, clientIp(c)))) {
    return c.json({ error: 'Too many requests. Please try again in 15 minutes.' }, 429);
  }
  try {
    const body = await parseBody(c.req, schemas.verifyEmail);
    if (!body || !body.email || !body.otp) {
      return c.json({ error: 'Email and code are required' }, 400);
    }
    const { email, otp } = body;

    const user = await getUserByEmail(c.env, email);
    if (!user) return c.json({ error: 'No account found' }, 404);
    if (user.is_verified) return c.json({ error: 'Email already verified' }, 400);

    if (!user.verification_otp || !user.verification_otp_expires) {
      return c.json({ error: 'No verification code found. Request a new one.' }, 400);
    }
    if (new Date(user.verification_otp_expires) < new Date()) {
      return c.json({ error: 'Code expired. Request a new one.' }, 400);
    }

    const isMatch = await verifyPassword(otp, user.verification_otp);
    if (!isMatch) return c.json({ error: 'Invalid code' }, 400);

    await updateRow(c.env, 'users', user.id, {
      is_verified: 1,
      verification_otp: null,
      verification_otp_expires: null,
      last_login_at: nowIso(),
      login_count: (user.login_count || 0) + 1,
    });

    const { token, expiresAt } = await generateToken(c.env.JWT_SECRET, user);
    return c.json({
      message: 'Email verified successfully',
      token,
      expiresAt,
      user: smallUser(user),
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

// Forgot password — send OTP (uniform response, no enumeration)
auth.post('/forgot-password', async (c) => {
  if (!(await rateLimit(c.env.RL_OTP, clientIp(c)))) {
    return c.json({ error: 'Too many requests. Please try again in 15 minutes.' }, 429);
  }
  try {
    const body = await parseBody(c.req, schemas.emailOnly);
    const email = body?.email;
    if (!email) return c.json({ error: 'Email is required' }, 400);
    if (await turnstileBlocked(c, body?.turnstileToken)) {
      return c.json({ error: 'Verification failed. Please refresh and try again.' }, 403);
    }

    const user = await getUserByEmail(c.env, email);
    if (!user || !user.is_verified) {
      return c.json({ message: 'If that email exists, a reset code was sent' });
    }

    const otp = generateOTP();
    await updateRow(c.env, 'users', user.id, {
      reset_password_otp: await hashPassword(otp),
      reset_password_otp_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    await sendOTPEmail(c.env, user.email, otp, 'reset');
    return c.json({ message: 'If that email exists, a reset code was sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json({ error: 'Failed to send reset code' }, 500);
  }
});

// Reset password with OTP (now rate-limited — was unprotected in the old backend)
auth.post('/reset-password', async (c) => {
  if (!(await rateLimit(c.env.RL_RESET, clientIp(c)))) {
    return c.json({ error: 'Too many requests. Please try again in 15 minutes.' }, 429);
  }
  try {
    const body = await parseBody(c.req, schemas.resetPassword);
    if (!body || !body.email || !body.otp || !body.newPassword) {
      return c.json({ error: 'Email, code and new password are required' }, 400);
    }
    const { email, otp, newPassword } = body;
    if (newPassword.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    const user = await getUserByEmail(c.env, email);
    if (!user) return c.json({ error: 'No account found' }, 404);

    if (!user.reset_password_otp || !user.reset_password_otp_expires) {
      return c.json({ error: 'No reset code found. Request a new one.' }, 400);
    }
    if (new Date(user.reset_password_otp_expires) < new Date()) {
      return c.json({ error: 'Code expired. Request a new one.' }, 400);
    }

    const isMatch = await verifyPassword(otp, user.reset_password_otp);
    if (!isMatch) return c.json({ error: 'Invalid code' }, 400);

    await updateRow(c.env, 'users', user.id, {
      password: await hashPassword(newPassword),
      reset_password_otp: null,
      reset_password_otp_expires: null,
    });

    return c.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ error: 'Password reset failed' }, 500);
  }
});

// Get current user (NOTE: 401 for invalid token here — not 403; old-route parity)
auth.get('/me', async (c) => {
  const token = c.req.header('authorization')?.split(' ')[1];
  if (!token) return c.json({ error: 'Not authenticated' }, 401);

  const decoded = await verifyToken(c.env.JWT_SECRET, token);
  if (!decoded) return c.json({ error: 'Invalid token' }, 401);

  const user = await getUserById(c.env, decoded.id);
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ user: serializeUser(user) });
});

// Update profile
auth.patch('/profile', async (c) => {
  const token = c.req.header('authorization')?.split(' ')[1];
  if (!token) return c.json({ error: 'Not authenticated' }, 401);

  try {
    const decoded = await verifyToken(c.env.JWT_SECRET, token);
    if (!decoded) return c.json({ error: 'Failed to update profile' }, 500);

    const body = await parseBody(c.req, schemas.profilePatch);
    if (!body) return c.json({ error: 'Failed to update profile' }, 500);
    const updates: Record<string, string | number | null | undefined> = {
      name: body.name,
      avatar: body.avatar,
    };
    if (body.country !== undefined) updates.country = body.country;
    if (body.profession !== undefined) updates.profession = body.profession;
    if (body.preferredLanguage !== undefined)
      updates.preferred_language = body.preferredLanguage;
    if (body.summaryLanguage !== undefined)
      updates.summary_language = body.summaryLanguage;
    if (body.autoSave !== undefined) updates.auto_save = body.autoSave ? 1 : 0;
    if (body.cloudSync !== undefined) updates.cloud_sync = body.cloudSync ? 1 : 0;
    if (body.privacyAccepted === true) {
      updates.privacy_accepted = 1;
      updates.privacy_accepted_at = nowIso();
    }
    if (body.onboardingSeen === true) updates.onboarding_seen = 1;

    await updateRow(c.env, 'users', decoded.id, updates);
    const user = await getUserById(c.env, decoded.id);
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ user: serializeUser(user) });
  } catch {
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Google Sign-In
auth.post('/google', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.googleAuth);
    const idToken = body?.idToken;
    if (!idToken) return c.json({ error: 'ID token required' }, 400);

    const profile = await verifyGoogleIdToken(idToken, c.env.GOOGLE_CLIENT_ID ?? '');
    if (!profile) return c.json({ error: 'Google authentication failed' }, 401);

    let user = await getUserByEmail(c.env, profile.email);
    if (!user) {
      // Random password (never used for Google accounts; replaces the old
      // googleId+JWT_SECRET pseudo-password)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      user = await insertUser(c.env, {
        name: profile.name ?? profile.email,
        email: profile.email,
        password: await hashPassword(randomPassword),
        google_id: profile.sub,
        is_verified: 1,
        last_login_at: nowIso(),
        login_count: 1,
      });
    } else {
      await updateRow(c.env, 'users', user.id, {
        google_id: user.google_id ?? profile.sub,
        is_verified: 1,
        last_login_at: nowIso(),
        login_count: (user.login_count || 0) + 1,
      });
    }

    const { token, expiresAt } = await generateToken(c.env.JWT_SECRET, user);
    return c.json({ token, expiresAt, user: smallUser(user) });
  } catch (error) {
    console.error('Google auth error:', error);
    return c.json({ error: (error as Error).message || 'Google authentication failed' }, 401);
  }
});

// Refresh token — issues a fresh 7-day token (sliding session)
auth.post('/refresh', authenticateToken, async (c) => {
  try {
    const user = await getUserById(c.env, c.get('user').id);
    if (!user) return c.json({ error: 'User not found' }, 401);
    const { token, expiresAt } = await generateToken(c.env.JWT_SECRET, user);
    return c.json({ token, expiresAt });
  } catch {
    return c.json({ error: 'Failed to refresh token' }, 500);
  }
});

// Delete account (now rate-limited)
auth.post('/delete-account', async (c) => {
  if (!(await rateLimit(c.env.RL_RESET, clientIp(c)))) {
    return c.json({ error: 'Too many requests. Please try again in 15 minutes.' }, 429);
  }
  try {
    const body = await parseBody(c.req, schemas.deleteAccount);
    if (!body || !body.email || !body.password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    const { email, password } = body;

    const user = await getUserByEmail(c.env, email);
    if (!user) return c.json({ error: 'No account found with this email' }, 404);

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) return c.json({ error: 'Incorrect password' }, 401);

    // Delete audio files from R2 before removing DB records
    const recordings = await c.env.DB.prepare(
      'SELECT audio_key FROM recordings WHERE user_id = ? AND audio_key IS NOT NULL',
    )
      .bind(user.id)
      .all<{ audio_key: string }>();
    await Promise.allSettled(
      (recordings.results ?? []).map((r) => deleteAudio(c.env, r.audio_key)),
    );

    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM recordings WHERE user_id = ?').bind(user.id),
      c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);

    return c.json({ message: 'Account and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

// Public account deletion REQUEST (no login required — emails support)
auth.post('/request-deletion', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.requestDeletion);
    if (!body || !body.name || !body.email || !body.reason) {
      return c.json({ error: 'Name, email and reason are required' }, 400);
    }
    // Web-only form: enforce Turnstile when configured (no mobile path to exempt).
    if (c.env.TURNSTILE_SECRET && !(await verifyTurnstile(c.env, body.turnstileToken, clientIp(c)))) {
      return c.json({ error: 'Verification failed. Please refresh and try again.' }, 403);
    }
    const { name, email, reason, additionalInfo } = body;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Invalid email address' }, 400);
    }
    await sendDeletionRequestEmail(c.env, {
      name,
      email,
      reason,
      additionalInfo: additionalInfo || '',
    });
    return c.json({ message: 'Deletion request submitted successfully' });
  } catch (error) {
    console.error('Deletion request error:', error);
    return c.json({ error: 'Failed to send deletion request. Please email us directly.' }, 500);
  }
});

auth.post('/contact', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.contact);
    if (!body || !body.name || !body.email || !body.subject || !body.message) {
      return c.json({ error: 'All fields are required' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return c.json({ error: 'Invalid email address' }, 400);
    }
    // Web-only form: enforce Turnstile when configured (no mobile path to exempt).
    if (c.env.TURNSTILE_SECRET && !(await verifyTurnstile(c.env, body.turnstileToken, clientIp(c)))) {
      return c.json({ error: 'Verification failed. Please refresh and try again.' }, 403);
    }
    await sendContactEmail(c.env, {
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
    });
    return c.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    return c.json({ error: 'Failed to send message. Please email us directly.' }, 500);
  }
});

// Accept privacy policy — saves consent to DB
auth.post('/accept-privacy', authenticateToken, async (c) => {
  try {
    await updateRow(c.env, 'users', c.get('user').id, {
      privacy_accepted: 1,
      privacy_accepted_at: nowIso(),
    });
    return c.json({ ok: true });
  } catch (error) {
    console.error('Accept privacy error:', error);
    return c.json({ error: 'Failed to save consent' }, 500);
  }
});

export default auth;
