// Fallback R2 push using the authenticated `wrangler` CLI (account-level R2
// access) instead of S3 credentials — for when no R2 API token with write
// access to the destination bucket is available. Routes bytes through this
// machine (get → put), so it's slower than copy-r2.ts's server-side CopyObject;
// prefer copy-r2.ts + a read(recai-audio)/write(echobit) token when possible.
//
// Copies the audio referenced by recordings (not orphans) and uploads
// transcript/summary/minutes text. Key schemes match apps/api/src/lib/derived.ts:
//   audio:  audio/<userId>/<fileId>.<ext>            (key preserved)
//   text:   <kind>/<userId>/<recordingId>.md         (transcript|summary|minutes)
//
// Flags: --skip-audio (text only), --no-cleanup (skip deleting the old
// derived/<uid>/<rid>/<kind>.md objects from a prior layout).
//
// Usage: bun run copy-r2-wrangler.ts [dumpDir=./dump] [--skip-audio]

import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = 'recai-audio';
const DEST = 'echobit';
const args = process.argv.slice(2);
const skipAudio = args.includes('--skip-audio');
const cleanup = !args.includes('--no-cleanup');
const dumpDir = args.find((a) => !a.startsWith('--')) ?? './dump';
const apiDir = join(import.meta.dir, '../../apps/api'); // run wrangler in the Worker's account context

const TEXT_KINDS = ['transcript', 'summary', 'minutes'] as const;

const oid = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && '$oid' in v) return (v as { $oid: string }).$oid;
  return String(v);
};

const wr = (a: string[]): void => {
  execFileSync('bunx', ['wrangler', ...a, '--remote'], { cwd: apiDir, stdio: 'pipe' });
};
const wrTry = (a: string[]): boolean => {
  try {
    wr(a);
    return true;
  } catch {
    return false;
  }
};

interface RecDoc {
  _id?: unknown;
  user?: unknown;
  audioKey?: string;
  audioMimeType?: string;
  transcript?: string;
  summary?: string;
  minutes?: string;
}

const file = join(dumpDir, 'recordings.ndjson');
if (!existsSync(file)) {
  console.error(`${file} not found — run export-mongo.ts first`);
  process.exit(1);
}
const docs = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as RecDoc);

// ── Audio: recai-audio → echobit (same key) ──────────────────────────────────
let aCopied = 0;
let aFailed = 0;
if (skipAudio) {
  console.log('Audio: skipped (--skip-audio)');
} else {
  console.log(`Audio: copying ${docs.filter((d) => d.audioKey).length} referenced objects…`);
  for (const d of docs) {
    const key = d.audioKey;
    if (!key) continue;
    const tmp = join(tmpdir(), `r2_${key.split('/').pop()}`);
    try {
      wr(['r2', 'object', 'get', `${SRC}/${key}`, `--file=${tmp}`]);
      wr(['r2', 'object', 'put', `${DEST}/${key}`, `--file=${tmp}`, '--content-type', d.audioMimeType || 'audio/webm']);
      aCopied++;
      if (aCopied % 20 === 0) console.log(`  …${aCopied} audio copied`);
    } catch (err) {
      aFailed++;
      console.error(`  ✗ audio ${key}: ${(err as Error).message.split('\n')[0]}`);
    } finally {
      rmSync(tmp, { force: true });
    }
  }
}

// ── Text: transcript/summary/minutes → echobit (<kind>/<uid>/<rid>.md) ───────
let tUploaded = 0;
let tFailed = 0;
let cleaned = 0;
const tmpMd = join(tmpdir(), 'r2_text.md');
console.log('Text: uploading transcript/summary/minutes…');
for (const d of docs) {
  const uid = oid(d.user);
  const rid = oid(d._id);
  if (!uid || !rid) continue;
  for (const kind of TEXT_KINDS) {
    // Best-effort: remove the old combined-folder object from the prior layout.
    if (cleanup && wrTry(['r2', 'object', 'delete', `${DEST}/derived/${uid}/${rid}/${kind}.md`])) cleaned++;
    const text = d[kind];
    if (!text) continue;
    try {
      writeFileSync(tmpMd, text);
      wr(['r2', 'object', 'put', `${DEST}/${kind}/${uid}/${rid}.md`, `--file=${tmpMd}`, '--content-type', 'text/markdown; charset=utf-8']);
      tUploaded++;
      if (tUploaded % 50 === 0) console.log(`  …${tUploaded} text uploaded`);
    } catch (err) {
      tFailed++;
      console.error(`  ✗ ${kind} ${rid}: ${(err as Error).message.split('\n')[0]}`);
    }
  }
}
rmSync(tmpMd, { force: true });

console.log(`\nDone. audio: copied=${aCopied} failed=${aFailed} | text: uploaded=${tUploaded} failed=${tFailed} | old-derived deleted=${cleaned}`);
process.exit(aFailed === 0 && tFailed === 0 ? 0 : 1);
