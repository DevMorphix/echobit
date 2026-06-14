// Post-import verification: compares the Mongo NDJSON dump against the D1
// database (via `wrangler d1 execute --json`).
// Usage: bun run verify.ts [dumpDir=./dump] [--local]

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const dumpDir = process.argv[2]?.startsWith('--') ? './dump' : (process.argv[2] ?? './dump');
const local = process.argv.includes('--local');

const TABLES: Record<string, string> = {
  users: 'users',
  recordings: 'recordings',
  coupons: 'coupons',
  planconfigs: 'plan_configs',
  errorlogs: 'error_logs',
};

const d1 = (sql: string): Record<string, unknown>[] => {
  // Escape backslashes before quotes so the shell-embedded SQL is fully sanitized.
  const escaped = sql.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const cmd = `wrangler d1 execute echobit ${local ? '--local' : '--remote'} --json --command "${escaped}"`;
  const out = execSync(cmd, { cwd: '../../apps/api', encoding: 'utf8' });
  const parsed = JSON.parse(out) as { results: Record<string, unknown>[] }[];
  return parsed[0]?.results ?? [];
};

const ndjsonCount = (name: string): number => {
  const file = join(dumpDir, `${name}.ndjson`);
  if (!existsSync(file)) return 0;
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
};

let failures = 0;
const check = (label: string, expected: unknown, actual: unknown): void => {
  const ok = String(expected) === String(actual);
  console.log(`${ok ? '✅' : '❌'} ${label}: mongo=${expected} d1=${actual}`);
  if (!ok) failures++;
};

// Row counts per table
for (const [mongo, table] of Object.entries(TABLES)) {
  const d1Count = d1(`SELECT COUNT(*) AS n FROM ${table}`)[0]?.n;
  check(`${table} row count`, ndjsonCount(mongo), d1Count);
}

// Storage sum
if (existsSync(join(dumpDir, 'recordings.ndjson'))) {
  const docs = readFileSync(join(dumpDir, 'recordings.ndjson'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { audioSize?: number; user?: { $oid?: string } });
  const mongoSum = docs.reduce((n, d) => n + (d.audioSize ?? 0), 0);
  const d1Sum = d1('SELECT COALESCE(SUM(audio_size), 0) AS total FROM recordings')[0]?.total;
  check('SUM(audio_size)', mongoSum, d1Sum);

  // Per-user counts for the 5 heaviest users
  const perUser = new Map<string, number>();
  for (const d of docs) {
    const uid = d.user?.$oid ?? String(d.user);
    perUser.set(uid, (perUser.get(uid) ?? 0) + 1);
  }
  const top = [...perUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [uid, count] of top) {
    const d1Count = d1(`SELECT COUNT(*) AS n FROM recordings WHERE user_id = '${uid}'`)[0]?.n;
    check(`recordings for user ${uid}`, count, d1Count);
  }
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
