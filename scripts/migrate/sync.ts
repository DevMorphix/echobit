// One-shot Atlas → D1 (+ R2) sync orchestrator.
//
//   export-mongo → transform → import (wrangler d1) → copy-r2 → upload-derived → verify
//
// Idempotent end to end: run with --full for the initial backfill, then re-run
// (no flag) for delta syncs — the watermark is derived from D1's own
// MAX(updated_at), and every write is an upsert / size-checked object copy.
//
// Usage:
//   MONGODB_URI=... R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
//   bun run sync.ts [--full] [--since <ISO>] [--local] [--skip-r2] [--dump <dir>]
//
//   --full      Full backfill (ignore the D1 watermark). Use for the first run.
//   --since     Explicit watermark override (ISO); takes precedence over D1's.
//   --local     Target the local D1 (testing) instead of --remote.
//   --skip-r2   Sync rows only; skip the R2 audio copy.
//   --dump      Dump directory (default ./dump).

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const valOf = (flag: string) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};

const full = has('--full');
const local = has('--local');
const skipR2 = has('--skip-r2');
const sinceArg = valOf('--since');
const migrateDir = import.meta.dir;
const apiDir = join(migrateDir, '../../apps/api');
const dumpDir = valOf('--dump') ?? join(migrateDir, 'dump');
const sqlDir = join(dumpDir, 'sql');
const remoteFlag = local ? '--local' : '--remote';

// FK-safe import order (recordings.user_id → users.id); others are independent.
const TABLES = ['users', 'recordings', 'coupons', 'plan_configs', 'error_logs'];

const d1Query = (sql: string): Record<string, unknown>[] => {
  const out = execFileSync(
    'wrangler',
    ['d1', 'execute', 'echobit', remoteFlag, '--json', '--command', sql],
    { cwd: apiDir, encoding: 'utf8' },
  );
  const parsed = JSON.parse(out) as { results: Record<string, unknown>[] }[];
  return parsed[0]?.results ?? [];
};

const bun = (script: string, scriptArgs: string[]) =>
  execFileSync('bun', ['run', script, ...scriptArgs], { cwd: migrateDir, stdio: 'inherit' });

// ── 0. Schema preflight ──────────────────────────────────────────────────────
// Fail fast with a clear message if the target D1 is missing the schema or is
// behind on migrations — otherwise the failure surfaces mid-import as a cryptic
// "no column named …" after export/transform have already run.
const where = local ? 'local' : 'remote';
const cols = d1Query('PRAGMA table_info(recordings)').map((r) => r.name as string);
if (cols.length === 0) {
  console.error(
    `recordings table not found on the ${where} D1 — apply the schema first:\n` +
      `  (cd apps/api && bunx wrangler d1 execute echobit ${remoteFlag} --file=migrations/0001_init.sql)`,
  );
  process.exit(1);
}
if (!cols.includes('summary_chars')) {
  console.error(
    `${where} D1 schema is behind (recordings.summary_chars missing) — apply pending migrations first:\n` +
      `  (cd apps/api && bunx wrangler d1 execute echobit ${remoteFlag} --file=migrations/0002_summary_minutes_to_r2.sql)`,
  );
  process.exit(1);
}

// ── 1. Resolve the watermark ────────────────────────────────────────────────
let since: string | undefined;
if (full) {
  console.log('Full backfill (--full): ignoring D1 watermark.');
} else if (sinceArg) {
  since = sinceArg;
  console.log(`Watermark from --since: ${since}`);
} else {
  const maxes = TABLES.map((t) => {
    const m = d1Query(`SELECT MAX(updated_at) AS m FROM ${t}`)[0]?.m as string | null;
    return { table: t, m };
  });
  const empty = maxes.filter((x) => !x.m).map((x) => x.table);
  if (empty.length) {
    console.error(
      `D1 tables empty: ${empty.join(', ')}. Run the first sync with --full ` +
        `(incremental requires a prior backfill).`,
    );
    process.exit(1);
  }
  // Global low-watermark = oldest of the per-table maxes. Re-pulling a few
  // already-synced rows is harmless (upserts), and this never misses a write.
  since = maxes.map((x) => x.m as string).sort()[0];
  console.log(`Watermark from D1 MAX(updated_at): ${since}`);
}

// ── 2. Export ────────────────────────────────────────────────────────────────
console.log('\n── export-mongo ──');
bun('export-mongo.ts', since ? [dumpDir, '--since', since] : [dumpDir]);

// ── 3. Transform ───────────────────────────────────────────────────────────
console.log('\n── transform ──');
bun('transform.ts', [dumpDir]);

// ── 4. Import (FK-safe order) ────────────────────────────────────────────────
console.log('\n── import → D1 ──');
const sqlFiles = new Set(readdirSync(sqlDir).filter((f) => f.endsWith('.sql')));
for (const table of TABLES) {
  const file = `${table}.sql`;
  if (!sqlFiles.has(file)) continue;
  console.log(`  ${file}`);
  execFileSync(
    'wrangler',
    ['d1', 'execute', 'echobit', remoteFlag, '--file', join(sqlDir, file)],
    { cwd: apiDir, stdio: 'inherit' },
  );
}

// ── 5. Copy R2 audio + upload derived text (summary/minutes) ─────────────────
if (skipR2) {
  console.log('\n── copy-r2 + upload-derived skipped (--skip-r2) ──');
} else {
  console.log('\n── copy-r2 ──');
  bun('copy-r2.ts', []);
  console.log('\n── upload-derived (summary/minutes → R2) ──');
  bun('upload-derived.ts', [dumpDir]);
}

// ── 6. Verify ────────────────────────────────────────────────────────────────
// verify.ts asserts ndjson count == D1 count, which only holds for a full
// backfill. On a delta run the dump holds just the changed rows while D1 holds
// everything, so skip it (the export logged how many rows changed).
if (full) {
  console.log('\n── verify ──');
  bun('verify.ts', local ? [dumpDir, '--local'] : [dumpDir]);
} else {
  console.log('\n── verify skipped (delta run — counts differ from D1 by design) ──');
}

console.log('\nSync complete.');
