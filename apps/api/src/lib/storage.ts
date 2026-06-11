// R2 storage. The Worker uses the BUCKET binding for direct object access;
// aws4fetch signs presigned GET/PUT URLs (the binding can't mint those),
// keeping the /upload-url contract and signed audioUrl behavior identical
// to backend/config/storage.js.

import { AwsClient } from 'aws4fetch';
import { newId } from '@echobit/shared/ids';
import { getExtensionFromMimeType } from './mime.ts';
import type { Env } from '../types.ts';

const SIGNED_GET_EXPIRY_UPLOAD = 604_800; // 7 days (parity with uploadAudio)
const SIGNED_GET_EXPIRY_DEFAULT = 3_600; // 1 hour (parity with getAudioUrl)

const awsClient = (env: Env): AwsClient =>
  new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
  });

const objectUrl = (env: Env, key: string): URL =>
  new URL(
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
  );

const signUrl = async (
  env: Env,
  key: string,
  method: 'GET' | 'PUT',
  expiresIn: number,
): Promise<string> => {
  const url = objectUrl(env, key);
  url.searchParams.set('X-Amz-Expires', String(expiresIn));
  const signed = await awsClient(env).sign(new Request(url, { method }), {
    aws: { signQuery: true, service: 's3', region: 'auto' },
  });
  return signed.url;
};

export const hasR2Credentials = (env: Env): boolean =>
  !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);

/** Upload audio bytes and return { key, url (7-day signed), size }. */
export const uploadAudio = async (
  env: Env,
  body: Uint8Array | ReadableStream,
  userId: string,
  mimeType = 'audio/webm',
  size?: number,
): Promise<{ key: string; url: string | null; size: number }> => {
  const extension = getExtensionFromMimeType(mimeType);
  const key = `audio/${userId}/${newId()}.${extension}`;

  const object = await env.BUCKET.put(key, body as Uint8Array, {
    httpMetadata: { contentType: mimeType },
  });

  const url = hasR2Credentials(env) ? await signUrl(env, key, 'GET', SIGNED_GET_EXPIRY_UPLOAD) : null;
  return { key, url, size: size ?? object?.size ?? 0 };
};

/** Signed GET URL for an existing object (default 1 hour). */
export const getAudioUrl = (env: Env, key: string, expiresIn = SIGNED_GET_EXPIRY_DEFAULT) =>
  signUrl(env, key, 'GET', expiresIn);

export const deleteAudio = async (env: Env, key: string | null | undefined): Promise<void> => {
  if (!key) return;
  await env.BUCKET.delete(key);
};

/** Presigned PUT URL for direct client upload (1 hour) — /upload-url contract. */
export const getUploadUrl = async (
  env: Env,
  userId: string,
  mimeType = 'audio/webm',
): Promise<{ uploadUrl: string; key: string }> => {
  const extension = getExtensionFromMimeType(mimeType);
  const key = `audio/${userId}/${newId()}.${extension}`;
  const uploadUrl = await signUrl(env, key, 'PUT', 3_600);
  return { uploadUrl, key };
};
