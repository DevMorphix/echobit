// R2-backed chunk staging for the mobile chunked-upload protocol
// (POST /upload-chunk × N → POST /finalize-upload). Replaces the old
// in-memory Map — chunks survive isolate restarts and multi-colo routing.
// Stale staging objects are purged by an R2 lifecycle rule on `uploads/`
// (configure: abort multipart + delete after 1 day).
//
// Contract notes (from mobile-app/rec-ai/src/services/api.ts):
// - chunks are 5 MB slices of one base64 data-URL string; chunk 0 carries the
//   "data:<mime>;base64," prefix and chunks are NOT independently decodable,
//   so finalize decodes with a ≤3-char carry across chunk boundaries.

import { newId } from '@echobit/shared/ids';
import { getExtensionFromMimeType } from '../lib/mime.ts';
import type { Env } from '../types.ts';

const chunkKey = (userId: string, uploadId: string, index: number): string =>
  `uploads/${userId}/${uploadId}/${String(index).padStart(6, '0')}`;

const metaKey = (userId: string, uploadId: string): string =>
  `uploads/${userId}/${uploadId}/meta.json`;

export interface UploadMeta {
  totalChunks: number;
  createdAt: number;
}

export const putChunk = async (
  env: Env,
  userId: string,
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  chunk: string,
): Promise<void> => {
  await env.BUCKET.put(chunkKey(userId, uploadId, chunkIndex), chunk);
  if (chunkIndex === 0) {
    const meta: UploadMeta = { totalChunks, createdAt: Date.now() };
    await env.BUCKET.put(metaKey(userId, uploadId), JSON.stringify(meta));
  }
};

export const getUploadMeta = async (
  env: Env,
  userId: string,
  uploadId: string,
): Promise<UploadMeta | null> => {
  const obj = await env.BUCKET.get(metaKey(userId, uploadId));
  if (!obj) return null;
  try {
    return (await obj.json()) as UploadMeta;
  } catch {
    return null;
  }
};

/** Index of the first missing chunk, or -1 when all are present. */
export const findMissingChunk = async (
  env: Env,
  userId: string,
  uploadId: string,
  totalChunks: number,
): Promise<number> => {
  const prefix = `uploads/${userId}/${uploadId}/`;
  const present = new Set<string>();
  let cursor: string | undefined;
  do {
    const listing = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    for (const obj of listing.objects) present.add(obj.key);
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);

  for (let i = 0; i < totalChunks; i++) {
    if (!present.has(chunkKey(userId, uploadId, i))) return i;
  }
  return -1;
};

export const deleteStagedUpload = async (
  env: Env,
  userId: string,
  uploadId: string,
): Promise<void> => {
  const prefix = `uploads/${userId}/${uploadId}/`;
  let cursor: string | undefined;
  do {
    const listing = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    if (listing.objects.length) {
      await env.BUCKET.delete(listing.objects.map((o) => o.key));
    }
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);
};

/** Rough decoded size of a staged upload (base64 ≈ 4/3 of raw). */
export const estimateAssembledSize = async (
  env: Env,
  userId: string,
  uploadId: string,
): Promise<number> => {
  const prefix = `uploads/${userId}/${uploadId}/`;
  let total = 0;
  let cursor: string | undefined;
  do {
    const listing = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    for (const obj of listing.objects) {
      if (!obj.key.endsWith('meta.json')) total += obj.size;
    }
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);
  return Math.floor(total * 0.75);
};

const MIN_PART_SIZE = 5 * 1024 * 1024; // R2 multipart minimum (except last part)

const decodeBase64 = (chunk: string): Uint8Array =>
  Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0));

/**
 * Streaming base64 decoder for the mobile chunk protocol: chunk 0 carries the
 * data-URL prefix, and slices are NOT aligned to 4-char base64 groups, so a
 * ≤3-char carry is held between pushes.
 */
export class Base64StreamDecoder {
  private carry = '';
  private first = true;

  push(text: string, isLast: boolean): Uint8Array {
    let combined = this.carry + text;
    if (this.first) {
      combined = combined.replace(/^data:[^,]+,/, '');
      this.first = false;
    }
    const usable = isLast ? combined.length : combined.length - (combined.length % 4);
    this.carry = combined.slice(usable);
    const clean = combined.slice(0, usable);
    return clean ? decodeBase64(clean) : new Uint8Array(0);
  }
}

/**
 * Assemble staged chunks into the final audio object via R2 multipart upload.
 * Streams base64 → bytes chunk-by-chunk with a ≤3-char carry; peak memory is
 * one chunk + one part buffer (~12 MB) regardless of total file size.
 */
export const assembleUpload = async (
  env: Env,
  userId: string,
  uploadId: string,
  totalChunks: number,
  mimeType: string,
): Promise<{ key: string; size: number }> => {
  const extension = getExtensionFromMimeType(mimeType);
  const finalKey = `audio/${userId}/${newId()}.${extension}`;

  const multipart = await env.BUCKET.createMultipartUpload(finalKey, {
    httpMetadata: { contentType: mimeType },
  });

  try {
    const parts: R2UploadedPart[] = [];
    let partNumber = 1;
    let partBuffer: Uint8Array[] = [];
    let partBytes = 0;
    let totalSize = 0;
    const decoder = new Base64StreamDecoder();

    const flushPart = async (): Promise<void> => {
      if (partBytes === 0) return;
      const joined = new Uint8Array(partBytes);
      let offset = 0;
      for (const piece of partBuffer) {
        joined.set(piece, offset);
        offset += piece.length;
      }
      parts.push(await multipart.uploadPart(partNumber++, joined));
      partBuffer = [];
      partBytes = 0;
    };

    for (let i = 0; i < totalChunks; i++) {
      const obj = await env.BUCKET.get(chunkKey(userId, uploadId, i));
      if (!obj) throw new Error(`Missing chunk ${i}`);
      const bytes = decoder.push(await obj.text(), i === totalChunks - 1);
      if (bytes.length) {
        partBuffer.push(bytes);
        partBytes += bytes.length;
        totalSize += bytes.length;
      }
      if (partBytes >= MIN_PART_SIZE) await flushPart();
    }
    await flushPart();

    await multipart.complete(parts);
    await deleteStagedUpload(env, userId, uploadId);
    return { key: finalKey, size: totalSize };
  } catch (err) {
    await multipart.abort().catch(() => {});
    throw err;
  }
};
