// Request-body validation. The `c.req.json<T>()` casts used previously are
// compile-time only — these schemas enforce the types at runtime so malformed
// payloads become clean 400s instead of D1 bind() errors or unbounded loops.
//
// Contract rule: schemas are deliberately LENIENT (every field optional,
// numbers coerced, unknown keys stripped) and parse failures are mapped by
// each route to its frozen legacy error response — zod's own error messages
// must never reach a client on contract endpoints.

import { z } from 'zod';

/**
 * Parse a JSON request body against a schema.
 * Returns the typed data, or null when the body is missing, malformed JSON,
 * a non-object, or has wrong-typed fields.
 */
export const parseBody = async <S extends z.ZodType>(
  req: { json: () => Promise<unknown> },
  schema: S,
): Promise<z.output<S> | null> => {
  const raw = await req.json().catch(() => null);
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const result = schema.safeParse(raw);
  return result.success ? result.data : null;
};

const optStr = z.string().optional();
const nullishStr = z.string().nullish();
const optNum = z.coerce.number().optional();
const optBool = z.boolean().optional();
// OTPs arrive as strings from our clients, but a numeric code is unambiguous
const otpField = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined ? undefined : String(v)));

export const RECORDING_STATUSES = [
  'pending',
  'transcribing',
  'transcribed',
  'summarized',
  'completed',
  'failed',
] as const;

// Mobile slices uploads at 5MB base64 chars against a 100MB body cap, so a
// legitimate upload never approaches this; it bounds findMissingChunk loops
// and staging-key fan-out.
export const MAX_TOTAL_CHUNKS = 500;

export const schemas = {
  // ── auth ──────────────────────────────────────────────────────────────────
  register: z.object({
    name: optStr,
    email: optStr,
    password: optStr,
    country: nullishStr,
    profession: nullishStr,
    preferredLanguage: nullishStr,
    turnstileToken: optStr,
  }),
  login: z.object({ email: optStr, password: optStr }),
  emailOnly: z.object({ email: optStr, turnstileToken: optStr }),
  verifyEmail: z.object({ email: optStr, otp: otpField }),
  resetPassword: z.object({ email: optStr, otp: otpField, newPassword: optStr }),
  deleteAccount: z.object({ email: optStr, password: optStr }),
  requestDeletion: z.object({
    name: optStr,
    email: optStr,
    reason: optStr,
    additionalInfo: optStr,
    turnstileToken: optStr,
  }),
  contact: z.object({
    name: optStr,
    email: optStr,
    subject: optStr,
    message: optStr,
    turnstileToken: optStr,
  }),
  googleAuth: z.object({ idToken: optStr }),
  profilePatch: z.object({
    name: optStr,
    avatar: nullishStr,
    country: nullishStr,
    profession: nullishStr,
    preferredLanguage: nullishStr,
    summaryLanguage: nullishStr,
    autoSave: optBool,
    cloudSync: optBool,
    privacyAccepted: optBool,
    onboardingSeen: optBool,
  }),

  // ── recordings ────────────────────────────────────────────────────────────
  uploadChunk: z
    .object({
      uploadId: z.string().min(1),
      chunkIndex: z.coerce.number().int().min(0),
      totalChunks: z.coerce.number().int().min(1).max(MAX_TOTAL_CHUNKS),
      chunk: z.string(),
    })
    .refine((v) => v.chunkIndex < v.totalChunks),
  finalizeUpload: z.object({
    uploadId: optStr,
    duration: optNum,
    mimeType: optStr,
    title: optStr,
  }),
  uploadUrl: z.object({ mimeType: optStr, duration: optNum }),
  createRecording: z.object({
    title: optStr,
    audioData: optStr,
    audioKey: optStr,
    audioSize: optNum,
    duration: optNum,
    transcript: optStr,
    mimeType: optStr,
    autoTranscribe: optBool,
    tempUpload: optBool,
    async: optBool,
  }),
  recordingPatch: z.object({
    title: optStr,
    transcript: optStr,
    summary: optStr,
    minutes: optStr,
    status: z.enum(RECORDING_STATUSES).optional(),
    tags: z.array(z.string()).optional(),
    actionItems: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
  asyncFlag: z.object({ async: optBool }),
  summarize: z.object({ transcript: optStr }),

  // ── meetings (Google Meet bot) ──────────────────────────────────────────────
  createMeeting: z.object({
    meetingUrl: z.string().min(1),
    title: optStr,
    scheduledAt: nullishStr, // ISO timestamp; omitted/null = join now
  }),

  // ── payments ──────────────────────────────────────────────────────────────
  validateCoupon: z.object({ code: optStr, plan: optStr }),
  createOrder: z.object({ plan: optStr, couponCode: optStr }),
  verifyPayment: z.object({
    razorpay_order_id: optStr,
    razorpay_payment_id: optStr,
    razorpay_signature: optStr,
    plan: optStr,
  }),

  // ── admin ─────────────────────────────────────────────────────────────────
  overridesPatch: z.object({
    meetingMinutes: z.boolean().nullish(),
    actionItems: z.boolean().nullish(),
    pdfExport: z.boolean().nullish(),
    indianLanguages: z.boolean().nullish(),
  }),
  couponCreate: z.object({
    code: optStr,
    discountType: optStr,
    discountValue: z.union([z.number(), z.string()]).nullish(),
    applicablePlans: z.array(z.string()).optional(),
    maxUses: z.union([z.number(), z.string()]).nullish(),
    expiresAt: nullishStr,
  }),
  couponPatch: z.object({
    isActive: optBool,
    maxUses: z.union([z.number(), z.string()]).nullish(),
    expiresAt: nullishStr,
  }),
  planConfigPut: z.object({
    features: z.array(z.object({ text: z.string(), included: z.boolean().optional() })).optional(),
    monthlyPrice: optStr,
    annualMonthly: optStr,
    annualTotal: optStr,
    monthlyPaise: z.union([z.number(), z.string()]).optional(),
    gates: z
      .object({
        meetingMinutes: z.boolean().nullish(),
        actionItems: z.boolean().nullish(),
        pdfExport: z.boolean().nullish(),
        indianLanguages: z.boolean().nullish(),
        recordingsPerMonth: z.number().nullish(),
        maxDurationMins: z.number().nullish(),
        maxStorageGB: z.number().nullish(),
      })
      .optional(),
  }),
} as const;
