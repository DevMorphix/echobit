// Upload each recording's transcript/summary/minutes text from the Mongo dump
// to R2, where the v2 Worker reads them (D1 stores only char counts). Key scheme
// MUST match apps/api/src/lib/derived.ts: <kind>/<userId>/<recordingId>.md
//
// Idempotent: non-empty text is overwritten (so delta runs pick up edits);
// empty fields are skipped (no object created). Reads recordings.ndjson.
//
// Usage:
//   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
//   [DEST_BUCKET=echobit] bun run upload-derived.ts [dumpDir=./dump]

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required');
  process.exit(1);
}

const DEST = process.env.DEST_BUCKET ?? 'echobit';
const dumpDir = process.argv[2] ?? './dump';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const oid = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && '$oid' in v) return (v as { $oid: string }).$oid;
  return String(v);
};

const file = join(dumpDir, 'recordings.ndjson');
if (!existsSync(file)) {
  console.error(`${file} not found — run export-mongo.ts first`);
  process.exit(1);
}

interface RecDoc {
  _id?: unknown;
  user?: unknown;
  transcript?: string;
  summary?: string;
  minutes?: string;
}

const KINDS = ['transcript', 'summary', 'minutes'] as const;

const docs = readFileSync(file, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l) as RecDoc);

const put = async (userId: string, recId: string, kind: (typeof KINDS)[number], text: string) => {
  await s3.send(
    new PutObjectCommand({
      Bucket: DEST,
      Key: `${kind}/${userId}/${recId}.md`,
      Body: text,
      ContentType: 'text/markdown; charset=utf-8',
    }),
  );
};

let uploaded = 0;
let skipped = 0;
let failed = 0;

for (const d of docs) {
  const userId = oid(d.user);
  const recId = oid(d._id);
  if (!userId || !recId) {
    skipped++;
    continue;
  }
  for (const kind of KINDS) {
    const text = d[kind];
    if (!text) continue; // empty → no object
    try {
      await put(userId, recId, kind, text);
      uploaded++;
      if (uploaded % 100 === 0) console.log(`  …${uploaded} uploaded`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${recId}/${kind}: ${(err as Error).message}`);
    }
  }
}

console.log(`\nDone. uploaded=${uploaded} skipped(no-id)=${skipped} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
