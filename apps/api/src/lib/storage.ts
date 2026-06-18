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

const encodeKey = (key: string): string => key.split('/').map(encodeURIComponent).join('/');

const objectUrl = (env: Env, key: string): URL =>
  new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${encodeKey(key)}`);

/** Public read URL via the R2 custom domain (e.g. https://cdn.echobits.xyz/<key>). */
const publicUrl = (env: Env, key: string): string =>
  `${env.R2_PUBLIC_URL!.replace(/\/+$/, '')}/${encodeKey(key)}`;

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

/** Whether an audio read URL can be produced — via the public domain or S3 creds. */
export const canResolveAudioUrl = (env: Env): boolean =>
  !!env.R2_PUBLIC_URL || hasR2Credentials(env);

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

  return { key, url: await getAudioUrl(env, key, SIGNED_GET_EXPIRY_UPLOAD), size: size ?? object?.size ?? 0 };
};

/** Public read URL for an object — the R2 custom domain if configured, otherwise a
 *  presigned GET (default 1 hour). Returns null only when neither is available. */
export const getAudioUrl = (
  env: Env,
  key: string,
  expiresIn = SIGNED_GET_EXPIRY_DEFAULT,
): Promise<string | null> => {
  if (env.R2_PUBLIC_URL) return Promise.resolve(publicUrl(env, key));
  if (hasR2Credentials(env)) return signUrl(env, key, 'GET', expiresIn);
  return Promise.resolve(null);
};

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
