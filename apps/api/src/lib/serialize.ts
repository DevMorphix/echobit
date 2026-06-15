// The compatibility keystone: renders D1 rows exactly as Mongoose serialized
// its documents, so existing clients (including the published mobile app)
// see byte-equivalent JSON shapes.
//
// Notes pinned from the old backend:
// - User.toJSON strips password + OTP hashes but KEEPS the *Expires dates.
//   The user schema has no virtuals → no `id` field.
// - Recording detail/create routes call .toJSON() with virtuals → include
//   `id` and `formattedDuration`. The list route uses .lean({virtuals:true})
//   WITHOUT the lean-virtuals plugin, so list items lack the virtuals.
//   That asymmetry is intentional — do not normalize.
// - Dates are ISO-8601 strings with milliseconds (stored as such in D1).
// - `__v` is emitted as 0 (no client reads it).

import type { CouponRow, ErrorLogRow, RecordingRow, UserRow } from '../types.ts';

const bool = (v: number | boolean | null | undefined): boolean => !!v;

const parseJson = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const serializeUser = (row: UserRow) => ({
  _id: row.id,
  name: row.name,
  email: row.email,
  googleId: row.google_id,
  avatar: row.avatar,
  isActive: bool(row.is_active),
  isVerified: bool(row.is_verified),
  verificationOTPExpires: row.verification_otp_expires,
  resetPasswordOTPExpires: row.reset_password_otp_expires,
  privacyAccepted: bool(row.privacy_accepted),
  privacyAcceptedAt: row.privacy_accepted_at,
  onboardingSeen: bool(row.onboarding_seen),
  role: row.role,
  lastLoginAt: row.last_login_at,
  loginCount: row.login_count,
  country: row.country,
  profession: row.profession,
  preferredLanguage: row.preferred_language,
  summaryLanguage: row.summary_language,
  autoSave: bool(row.auto_save),
  cloudSync: bool(row.cloud_sync),
  featureOverrides: parseJson(row.feature_overrides, {
    meetingMinutes: null,
    actionItems: null,
    pdfExport: null,
    indianLanguages: null,
  }),
  plan: row.plan,
  planBillingCycle: row.plan_billing_cycle,
  planStartDate: row.plan_start_date,
  planExpiresAt: row.plan_expires_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  __v: 0,
});

export interface ActionItem {
  _id?: string;
  task?: string;
  assignee?: string | null;
  priority?: 'high' | 'medium' | 'low';
  deadline?: string | null;
  completed?: boolean;
}

const formattedDuration = (duration: number): string => {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// transcript/summary/minutes live in R2 (lib/derived.ts) and only the detail
// shape inlines them; audioUrl is re-signed from audio_key by the route.
const recordingBase = (row: RecordingRow) => ({
  _id: row.id,
  user: row.user_id,
  title: row.title,
  audioKey: row.audio_key,
  audioUrl: null as string | null,
  audioSize: row.audio_size,
  audioMimeType: row.audio_mime_type,
  duration: row.duration,
  actionItems: parseJson<ActionItem[]>(row.action_items, []),
  status: row.status,
  tags: parseJson<string[]>(row.tags, []),
  metadata: parseJson<Record<string, string>>(row.metadata, {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  __v: 0,
});

export interface DerivedText {
  transcript?: string;
  summary?: string;
  minutes?: string;
}

/** Mongoose .toJSON() shape (detail/create/update routes) — includes virtuals.
 *  transcript/summary/minutes come from R2 (default '' for a fresh recording). */
export const serializeRecording = (row: RecordingRow, derived: DerivedText = {}) => ({
  ...recordingBase(row),
  transcript: derived.transcript ?? '',
  summary: derived.summary ?? '',
  minutes: derived.minutes ?? '',
  id: row.id,
  formattedDuration: formattedDuration(row.duration),
});

/** Mongoose .lean() shape (list route) — no virtuals, no transcript/summary/minutes. */
export const serializeRecordingLean = (row: RecordingRow) => recordingBase(row);

export const serializeCoupon = (row: CouponRow) => ({
  _id: row.id,
  code: row.code,
  discountType: row.discount_type,
  discountValue: row.discount_value,
  applicablePlans: parseJson<string[]>(row.applicable_plans, []),
  maxUses: row.max_uses,
  usedCount: row.used_count,
  expiresAt: row.expires_at,
  isActive: bool(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  __v: 0,
});

export const serializeErrorLog = (row: ErrorLogRow) => ({
  _id: row.id,
  type: row.type,
  message: row.message,
  userId: row.user_id,
  recordingId: row.recording_id,
  meta: parseJson<Record<string, unknown>>(row.meta, {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  __v: 0,
});
