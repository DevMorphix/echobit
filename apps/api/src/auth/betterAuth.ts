import { betterAuth } from 'better-auth';
import { emailOTP, bearer, captcha } from 'better-auth/plugins';
import { hashPassword, verifyPassword } from '../lib/passwords.ts';
import { sendOTPEmail } from '../lib/email.ts';
import type { Env } from '../types.ts';

const SEVEN_DAYS = 60 * 60 * 24 * 7;

// users.password is NOT NULL but Better Auth stores credentials in `account`;
// give Better-Auth-created users a sentinel that verifyPassword always rejects.
const PASSWORD_SENTINEL = 'better-auth';

const trustedOrigins = (env: Env): string[] =>
  (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);

export type Auth = ReturnType<typeof createAuth>;

// Built per request: the D1 binding lives on `env`, which is request-scoped on Workers.
export const createAuth = (env: Env) =>
  betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: trustedOrigins(env),
    session: { expiresIn: SEVEN_DAYS },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      // Reuse the existing pbkdf2 hasher; verify also accepts legacy bcrypt.
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) => verifyPassword(password, hash),
      },
    },

    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },

    // Map Better Auth's user model onto the existing `users` table.
    user: {
      modelName: 'users',
      fields: {
        emailVerified: 'is_verified',
        image: 'avatar',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      additionalFields: {
        role: { type: 'string', required: false, input: false },
        plan: { type: 'string', required: false, input: false },
        planBillingCycle: { type: 'string', required: false, input: false, fieldName: 'plan_billing_cycle' },
        planExpiresAt: { type: 'string', required: false, input: false, fieldName: 'plan_expires_at' },
        country: { type: 'string', required: false, input: true },
        profession: { type: 'string', required: false, input: true },
        preferredLanguage: { type: 'string', required: false, input: true, fieldName: 'preferred_language' },
        summaryLanguage: { type: 'string', required: false, input: false, fieldName: 'summary_language' },
        privacyAccepted: { type: 'boolean', required: false, input: false, fieldName: 'privacy_accepted' },
        password: { type: 'string', required: false, input: false, returned: false },
      },
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, password: PASSWORD_SENTINEL } }),
        },
      },
    },

    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        async sendVerificationOTP({ email, otp, type }) {
          await sendOTPEmail(env, email, otp, type === 'forget-password' ? 'reset' : 'verify');
        },
      }),
      bearer(),
      ...(env.TURNSTILE_SECRET
        ? [captcha({
            provider: 'cloudflare-turnstile',
            secretKey: env.TURNSTILE_SECRET,
            endpoints: ['/sign-up/email', '/email-otp/request-password-reset'],
          })]
        : []),
    ],
  });
