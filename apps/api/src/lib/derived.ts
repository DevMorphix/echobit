// transcript/summary/minutes text lives in R2 keyed by recording (D1 keeps only
// char counts). Key scheme: <kind>/<userId>/<recordingId>.md

import type { Env } from '../types.ts';

export type DerivedKind = 'transcript' | 'summary' | 'minutes';
export const DERIVED_KINDS: DerivedKind[] = ['transcript', 'summary', 'minutes'];

export const derivedKey = (kind: DerivedKind, userId: string, recordingId: string): string =>
  `${kind}/${userId}/${recordingId}.md`;

export interface DerivedTexts {
  transcript: string;
  summary: string;
  minutes: string;
}

/** Read one kind from R2; '' when absent. Never throws to the caller. */
export const getDerivedText = async (
  env: Env,
  kind: DerivedKind,
  userId: string,
  recordingId: string,
): Promise<string> => {
  try {
    const obj = await env.BUCKET.get(derivedKey(kind, userId, recordingId));
    return obj ? await obj.text() : '';
  } catch {
    return '';
  }
};

/** All three texts for a recording, fetched in parallel (detail responses). */
export const getDerivedTexts = async (
  env: Env,
  userId: string,
  recordingId: string,
): Promise<DerivedTexts> => {
  const [transcript, summary, minutes] = await Promise.all(
    DERIVED_KINDS.map((k) => getDerivedText(env, k, userId, recordingId)),
  );
  return { transcript: transcript!, summary: summary!, minutes: minutes! };
};

/** Write one kind to R2 (an empty string deletes the object). */
export const putDerivedText = async (
  env: Env,
  kind: DerivedKind,
  userId: string,
  recordingId: string,
  text: string,
): Promise<void> => {
  const key = derivedKey(kind, userId, recordingId);
  if (!text) {
    await env.BUCKET.delete(key).catch(() => {});
    return;
  }
  await env.BUCKET.put(key, text, {
    httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
  });
};

/** Remove all derived objects for a recording (on delete). */
export const deleteDerivedTexts = async (
  env: Env,
  userId: string,
  recordingId: string,
): Promise<void> => {
  await env.BUCKET.delete(DERIVED_KINDS.map((k) => derivedKey(k, userId, recordingId))).catch(() => {});
};
