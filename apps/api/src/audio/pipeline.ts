// The shared transcription pipeline — one implementation used by BOTH the
// legacy-sync endpoints (published mobile app awaits in-request) and the
// queue consumer (async web path with retries + DLQ).
//
// Provider routing (parity with backend/routes/recordings.js):
// - Indian users (or no country set) with plan.indianLanguages + SARVAM key
//   → Sarvam, WHEN the audio is WAV (mobile recorder output). Non-WAV can't
//   be 25s-chunked without ffmpeg → Workers AI Whisper handles it instead.
// - Everyone else → Workers AI Whisper.

import { getPlanLimits } from '@echobit/shared/plan-limits';
import { transcribeWhisper, type TranscriptionResult } from './whisper.ts';
import { LANG_TO_SARVAM_CODE, transcribeSarvam, translateText } from './sarvam.ts';
import { looksLikeWav, memoryRangeReader, type RangeReader } from './wav.ts';
import { userPlanView } from '../lib/limits.ts';
import type { Env, UserRow } from '../types.ts';

// ─── User-language helpers (ported verbatim) ────────────────────────────────

export const isIndianUser = (user: UserRow | null): boolean => {
  if (!user) return true; // no user record → default to Sarvam
  const country = (user.country ?? '').toLowerCase().trim();
  if (!country) return true; // no country set → default to Sarvam
  return country === 'india' || country === 'in' || country === 'भारत';
};

export const getSarvamLanguageCode = (user: UserRow | null): string | null => {
  if (!user?.preferred_language) return null;
  return LANG_TO_SARVAM_CODE[user.preferred_language.toLowerCase()] ?? null;
};

/** Translate transcript to English if user is Indian (so Gemini always gets English). */
export const toEnglishTranscript = async (
  env: Env,
  transcript: string,
  user: UserRow | null,
): Promise<string> => {
  if (!isIndianUser(user) || !user?.preferred_language) return transcript;
  const lang = user.preferred_language.toLowerCase().trim();
  if (lang === 'english' || lang === 'en') return transcript;
  const sourceLangCode = LANG_TO_SARVAM_CODE[lang];
  if (!sourceLangCode || !env.SARVAM_API_KEY) return transcript;
  try {
    return await translateText(env, transcript, sourceLangCode, 'en-IN');
  } catch (e) {
    console.error('[Translate] Failed, using original transcript:', (e as Error).message);
    return transcript;
  }
};

/** Translate AI output back to the user's preferred summary language. */
export const toPreferredLanguage = async (
  env: Env,
  text: string,
  user: UserRow | null,
): Promise<string> => {
  if (!user?.summary_language) return text; // default = English
  const lang = user.summary_language.toLowerCase().trim();
  if (lang === 'english' || lang === 'en') return text;
  const targetLangCode = LANG_TO_SARVAM_CODE[lang];
  if (!targetLangCode || !env.SARVAM_API_KEY) return text;
  try {
    return await translateText(env, text, 'en-IN', targetLangCode);
  } catch (e) {
    console.error('[Translate] Output translation failed, returning English:', (e as Error).message);
    return text;
  }
};

// ─── Transcription dispatch ─────────────────────────────────────────────────

export interface AudioSource {
  bytes?: Uint8Array;
  read?: RangeReader;
  size: number;
}

/** R2-object-backed source: ranged reads keep multi-hour WAVs out of memory. */
export const r2AudioSource = async (env: Env, key: string): Promise<AudioSource | null> => {
  const headObj = await env.BUCKET.head(key);
  if (!headObj) return null;
  const read: RangeReader = async (offset, length) => {
    const obj = await env.BUCKET.get(key, { range: { offset, length } });
    if (!obj) throw new Error(`R2 object disappeared: ${key}`);
    return new Uint8Array(await obj.arrayBuffer());
  };
  return { read, size: headObj.size };
};

export const transcribeAudio = async (
  env: Env,
  source: AudioSource,
  mimeType: string,
  user: UserRow | null,
): Promise<TranscriptionResult> => {
  const limits = getPlanLimits(user ? userPlanView(user) : null);
  const read = source.read ?? memoryRangeReader(source.bytes ?? new Uint8Array(0));
  const head = await read(0, Math.min(512, source.size));

  const useSarvam =
    isIndianUser(user) && !!env.SARVAM_API_KEY && limits.indianLanguages && looksLikeWav(head);

  if (useSarvam) {
    console.log('[Transcription] Using Sarvam AI, lang:', getSarvamLanguageCode(user) ?? 'auto-detect');
    return transcribeSarvam(env, source, getSarvamLanguageCode(user));
  }
  console.log('[Transcription] Using Workers AI Whisper');
  return transcribeWhisper(env, source, mimeType);
};
