// Transform the Mongo NDJSON dump into D1-ready SQL.
// Usage: bun run transform.ts [dumpDir=./dump] [outDir=./dump/sql]
//
// - $oid → TEXT primary keys (ids preserved so `_id` responses stay identical)
// - Dates were serialized to ISO-8601-with-ms strings by export-mongo.ts
// - booleans → 0/1; arrays/objects → JSON TEXT
// - Statements are split below ~90 KB (D1 caps a single statement at 100 KB)
//
// Import with:
//   wrangler d1 execute echobit --remote --file=dump/sql/users.sql   (etc.)

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dumpDir = process.argv[2] ?? './dump';
const outDir = process.argv[3] ?? join(dumpDir, 'sql');
mkdirSync(outDir, { recursive: true });

type Doc = Record<string, unknown>;

const oid = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && '$oid' in v) return (v as { $oid: string }).$oid;
  return String(v);
};

const iso = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return new Date(v).toISOString();
  if (typeof v === 'object' && v !== null && '$date' in v) {
    return new Date((v as { $date: string | number }).$date).toISOString();
  }
  return null;
};

const bit = (v: unknown, def = 0): number => (v === undefined || v === null ? def : v ? 1 : 0);
const num = (v: unknown, def = 0): number => (typeof v === 'number' && !Number.isNaN(v) ? v : def);
const str = (v: unknown, def: string | null = null): string | null =>
  v === undefined || v === null ? def : String(v);

const sqlValue = (v: string | number | null): string => {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${v.replace(/'/g, "''")}'`;
};

const readDocs = (name: string): Doc[] => {
  const file = join(dumpDir, `${name}.ndjson`);
  if (!existsSync(file)) {
    console.warn(`(skip) ${file} not found`);
    return [];
  }
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Doc);
};

const MAX_STATEMENT = 90_000;

const writeSql = (
  table: string,
  columns: string[],
  rows: (string | number | null)[][],
): void => {
  const lines: string[] = [];
  const header = `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n`;
  let current: string[] = [];
  let currentLen = header.length;

  const flush = () => {
    if (current.length) lines.push(header + current.join(',\n') + ';');
    current = [];
    currentLen = header.length;
  };

  for (const row of rows) {
    const tuple = `(${row.map(sqlValue).join(', ')})`;
    if (currentLen + tuple.length > MAX_STATEMENT) flush();
    current.push(tuple);
    currentLen += tuple.length + 2;
  }
  flush();

  const out = join(outDir, `${table}.sql`);
  writeFileSync(out, lines.join('\n') + '\n');
  console.log(`${table}: ${rows.length} rows → ${out} (${lines.length} statements)`);
};

// ── users ────────────────────────────────────────────────────────────────────
{
  const docs = readDocs('users');
  const rows = docs.map((d) => [
    oid(d._id) as string,
    str(d.name, '') as string,
    (str(d.email, '') as string).toLowerCase().trim(),
    str(d.password, '') as string,
    str(d.googleId),
    str(d.avatar),
    bit(d.isActive, 1),
    bit(d.isVerified, 0),
    str(d.verificationOTP),
    iso(d.verificationOTPExpires),
    str(d.resetPasswordOTP),
    iso(d.resetPasswordOTPExpires),
    bit(d.privacyAccepted, 0),
    iso(d.privacyAcceptedAt),
    bit(d.onboardingSeen, 0),
    str(d.role, 'user') as string,
    iso(d.lastLoginAt),
    num(d.loginCount, 0),
    str(d.country),
    str(d.profession),
    str(d.preferredLanguage),
    str(d.summaryLanguage),
    bit(d.autoSave, 1),
    bit(d.cloudSync, 1),
    JSON.stringify({
      meetingMinutes: (d.featureOverrides as Doc | undefined)?.meetingMinutes ?? null,
      actionItems: (d.featureOverrides as Doc | undefined)?.actionItems ?? null,
      pdfExport: (d.featureOverrides as Doc | undefined)?.pdfExport ?? null,
      indianLanguages: (d.featureOverrides as Doc | undefined)?.indianLanguages ?? null,
    }),
    str(d.plan, 'free') as string,
    str(d.planBillingCycle),
    iso(d.planStartDate),
    iso(d.planExpiresAt),
    iso(d.createdAt) ?? new Date(0).toISOString(),
    iso(d.updatedAt) ?? new Date(0).toISOString(),
  ]);
  writeSql(
    'users',
    [
      'id', 'name', 'email', 'password', 'google_id', 'avatar', 'is_active', 'is_verified',
      'verification_otp', 'verification_otp_expires', 'reset_password_otp',
      'reset_password_otp_expires', 'privacy_accepted', 'privacy_accepted_at', 'onboarding_seen',
      'role', 'last_login_at', 'login_count', 'country', 'profession', 'preferred_language',
      'summary_language', 'auto_save', 'cloud_sync', 'feature_overrides', 'plan',
      'plan_billing_cycle', 'plan_start_date', 'plan_expires_at', 'created_at', 'updated_at',
    ],
    rows,
  );
}

// ── recordings ───────────────────────────────────────────────────────────────
{
  const docs = readDocs('recordings');
  const rows = docs.map((d) => [
    oid(d._id) as string,
    oid(d.user) as string,
    str(d.title, 'Recording') as string,
    str(d.audioKey),
    str(d.audioUrl),
    num(d.audioSize, 0),
    str(d.audioMimeType, 'audio/webm') as string,
    Math.round(num(d.duration, 0)),
    str(d.transcript, '') as string,
    str(d.summary, '') as string,
    str(d.minutes, '') as string,
    JSON.stringify(
      ((d.actionItems as Doc[] | undefined) ?? []).map((item) => ({
        ...item,
        _id: oid(item._id) ?? undefined,
      })),
    ),
    str(d.status, 'pending') as string,
    JSON.stringify((d.tags as string[] | undefined) ?? []),
    JSON.stringify((d.metadata as Record<string, string> | undefined) ?? {}),
    iso(d.createdAt) ?? new Date(0).toISOString(),
    iso(d.updatedAt) ?? new Date(0).toISOString(),
  ]);
  writeSql(
    'recordings',
    [
      'id', 'user_id', 'title', 'audio_key', 'audio_url', 'audio_size', 'audio_mime_type',
      'duration', 'transcript', 'summary', 'minutes', 'action_items', 'status', 'tags',
      'metadata', 'created_at', 'updated_at',
    ],
    rows,
  );
}

// ── coupons ──────────────────────────────────────────────────────────────────
{
  const docs = readDocs('coupons');
  const rows = docs.map((d) => [
    oid(d._id) as string,
    str(d.code, '') as string,
    str(d.discountType, 'percent') as string,
    num(d.discountValue, 0),
    JSON.stringify((d.applicablePlans as string[] | undefined) ?? []),
    d.maxUses == null ? null : num(d.maxUses),
    num(d.usedCount, 0),
    iso(d.expiresAt),
    bit(d.isActive, 1),
    iso(d.createdAt) ?? new Date(0).toISOString(),
    iso(d.updatedAt) ?? new Date(0).toISOString(),
  ]);
  writeSql(
    'coupons',
    [
      'id', 'code', 'discount_type', 'discount_value', 'applicable_plans', 'max_uses',
      'used_count', 'expires_at', 'is_active', 'created_at', 'updated_at',
    ],
    rows,
  );
}

// ── plan_configs ─────────────────────────────────────────────────────────────
{
  const docs = readDocs('planconfigs');
  const rows = docs.map((d) => [
    oid(d._id) as string,
    str(d.plan, '') as string,
    JSON.stringify((d.features as Doc[] | undefined) ?? []),
    str(d.monthlyPrice, '') as string,
    str(d.annualMonthly, '') as string,
    str(d.annualTotal, '') as string,
    num(d.monthlyPaise, 0),
    JSON.stringify((d.gates as Doc | undefined) ?? {}),
    iso(d.createdAt) ?? new Date(0).toISOString(),
    iso(d.updatedAt) ?? new Date(0).toISOString(),
  ]);
  writeSql(
    'plan_configs',
    [
      'id', 'plan', 'features', 'monthly_price', 'annual_monthly', 'annual_total',
      'monthly_paise', 'gates', 'created_at', 'updated_at',
    ],
    rows,
  );
}

// ── error_logs ───────────────────────────────────────────────────────────────
{
  const docs = readDocs('errorlogs');
  const rows = docs.map((d) => [
    oid(d._id) as string,
    str(d.type, '') as string,
    str(d.message, '') as string,
    oid(d.userId),
    oid(d.recordingId),
    JSON.stringify((d.meta as Doc | undefined) ?? {}),
    iso(d.createdAt) ?? new Date(0).toISOString(),
    iso(d.updatedAt) ?? new Date(0).toISOString(),
  ]);
  writeSql(
    'error_logs',
    ['id', 'type', 'message', 'user_id', 'recording_id', 'meta', 'created_at', 'updated_at'],
    rows,
  );
}

console.log('\nDone. Import with:');
console.log('  for f in dump/sql/*.sql; do wrangler d1 execute echobit --remote --file=$f; done');
