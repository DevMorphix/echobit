// Copy recording audio from the legacy R2 bucket to the v2 bucket, key-for-key.
// Both buckets live in the same Cloudflare account, so CopyObject is a
// server-side copy (no download/upload). Keys are preserved, so the migrated
// `recordings.audio_key` stays valid with no rewriting.
//
// Idempotent: a dest object of matching size is skipped, so this is cheap to
// re-run as a delta alongside the row sync.
//
// Usage:
//   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
//   [SRC_BUCKET=recai-audio] [DEST_BUCKET=echobit] [PREFIX=audio/] \
//   bun run copy-r2.ts
//
// The R2 token must have read on SRC_BUCKET + write on DEST_BUCKET (an
// account-scoped R2 API token covers both).

import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required');
  process.exit(1);
}

const SRC = process.env.SRC_BUCKET ?? 'recai-audio';
const DEST = process.env.DEST_BUCKET ?? 'echobit';
const PREFIX = process.env.PREFIX ?? 'audio/'; // only the permanent store; skips transient uploads/

// Same client config as backend/config/storage.js — R2 rejects the checksums
// the AWS SDK v3 auto-injects, so disable them.
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

/** Dest object exists with the same byte size → already copied. */
const alreadyCopied = async (key: string, size: number | undefined): Promise<boolean> => {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: DEST, Key: key }));
    return size !== undefined && head.ContentLength === size;
  } catch {
    return false; // 404 (or any head failure) → copy it
  }
};

let copied = 0;
let skipped = 0;
let failed = 0;
let cursor: string | undefined;

console.log(`Copying ${SRC}/${PREFIX}* → ${DEST}/ (same keys)`);

do {
  const listing = await s3.send(
    new ListObjectsV2Command({ Bucket: SRC, Prefix: PREFIX, ContinuationToken: cursor }),
  );
  for (const obj of listing.Contents ?? []) {
    const key = obj.Key;
    if (!key) continue;
    if (await alreadyCopied(key, obj.Size)) {
      skipped++;
      continue;
    }
    try {
      await s3.send(
        new CopyObjectCommand({
          Bucket: DEST,
          Key: key,
          CopySource: `/${SRC}/${key.split('/').map(encodeURIComponent).join('/')}`,
        }),
      );
      copied++;
      if (copied % 100 === 0) console.log(`  …${copied} copied`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${key}: ${(err as Error).message}`);
    }
  }
  cursor = listing.IsTruncated ? listing.NextContinuationToken : undefined;
} while (cursor);

console.log(`\nDone. copied=${copied} skipped=${skipped} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
