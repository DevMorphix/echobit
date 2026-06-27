export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI: Ai;
  TRANSCRIBE_WF: Workflow<JobMessage>;
  FFMPEG: DurableObjectNamespace<import('./audio/transcode.ts').FfmpegContainer>;
  MEETING_BOT: DurableObjectNamespace<import('./meet/bot-do.ts').MeetingBot>;
  EMAIL: SendEmail;
  RL_LOGIN: RateLimitBinding;
  RL_OTP: RateLimitBinding;
  RL_RESET: RateLimitBinding;
  // Static assets (merged Astro promo + Vue app build); used to serve the Vue
  // SPA shell for app routes (see index.ts catch-all).
  ASSETS: Fetcher;

  // Secrets (wrangler secret put / .dev.vars)
  JWT_SECRET: string;
  SARVAM_API_KEY?: string;
  GEMINI_API_KEY?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_MOCK?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TURNSTILE_SECRET?: string;
  // Shared bearer token for the VM meeting bot (must match the bot's .env).
  MEET_BOT_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  // R2 S3 credentials only for presigned upload URLs (contract parity)
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;

  // Vars
  EMAIL_FROM: string;
  SUPPORT_EMAIL: string;
  R2_BUCKET_NAME: string;
  // Public R2 custom domain (e.g. https://cdn.echobits.xyz). When set, audio read
  // URLs are served directly from it instead of presigned S3 GET URLs.
  R2_PUBLIC_URL?: string;
  ALLOWED_ORIGINS?: string;
  // Base URL of the VM meeting bot (Cloudflare Tunnel hostname). Unset disables
  // the Meet recording bot (MeetingBot fails the job with a clear message).
  MEET_BOT_URL?: string;
  // AI Gateway (optional) — unset routes AI calls directly to providers
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_ID?: string;
  // Cloudflare Access (Zero Trust) — gates the admin surface. TEAM_DOMAIN is
  // "<team>.cloudflareaccess.com"; AUD is the Access application audience tag
  // (comma-separate to allow several). ADMIN_EMAILS is an optional extra
  // allowlist on top of the Access policy. ENVIRONMENT="development" bypasses
  // Access locally (it never runs in front of `wrangler dev`).
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
  ENVIRONMENT?: string;
}

/** JWT payload — exact claims the old backend issued (middleware/auth.js). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/** TranscriptionWorkflow payload (params passed to TRANSCRIBE_WF.create). */
export interface JobMessage {
  task: 'transcribe';
  recordingId: string;
  userId: string;
  // When true, the workflow also auto-runs summary/minutes/actions (gated by
  // plan) after transcription and emails the user. Used by the Meet bot.
  autoProcess?: boolean;
}

export interface HonoEnv {
  Bindings: Env;
  Variables: {
    user: AuthUser;
    // Verified email from the Cloudflare Access JWT (admin routes only).
    adminEmail?: string;
  };
}

// ---------- D1 row shapes ----------

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  google_id: string | null;
  avatar: string | null;
  is_active: number;
  is_verified: number;
  verification_otp: string | null;
  verification_otp_expires: string | null;
  reset_password_otp: string | null;
  reset_password_otp_expires: string | null;
  privacy_accepted: number;
  privacy_accepted_at: string | null;
  onboarding_seen: number;
  role: 'user' | 'admin';
  last_login_at: string | null;
  login_count: number;
  country: string | null;
  profession: string | null;
  preferred_language: string | null;
  summary_language: string | null;
  auto_save: number;
  cloud_sync: number;
  feature_overrides: string;
  plan: 'free' | 'starter' | 'pro' | 'growth' | 'team';
  plan_billing_cycle: 'monthly' | 'annual' | null;
  plan_start_date: string | null;
  plan_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordingRow {
  id: string;
  user_id: string;
  title: string;
  audio_key: string | null;
  audio_size: number;
  audio_mime_type: string;
  duration: number;
  // char counts only — text lives in R2 (lib/derived.ts)
  transcript_chars: number;
  summary_chars: number;
  minutes_chars: number;
  action_items: string;
  status:
    | 'pending'
    | 'transcribing'
    | 'transcribed'
    | 'summarizing'
    | 'summarized'
    | 'completed'
    | 'failed';
  tags: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export type MeetingBotStatus =
  | 'scheduled'
  | 'joining'
  | 'waiting'
  | 'recording'
  | 'uploading'
  | 'processing'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface MeetingBotRow {
  id: string;
  user_id: string;
  meeting_url: string;
  provider: string;
  title: string | null;
  scheduled_at: string | null;
  status: MeetingBotStatus;
  recording_id: string | null;
  duration_secs: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponRow {
  id: string;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  applicable_plans: string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PlanConfigRow {
  id: string;
  plan: string;
  features: string;
  monthly_price: string;
  annual_monthly: string;
  annual_total: string;
  monthly_paise: number;
  gates: string;
  created_at: string;
  updated_at: string;
}

export interface ErrorLogRow {
  id: string;
  type: string;
  message: string;
  user_id: string | null;
  recording_id: string | null;
  meta: string;
  created_at: string;
  updated_at: string;
}
