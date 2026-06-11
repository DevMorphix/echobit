// Sarvam AI speech-to-text + translation (Indian languages — the product
// differentiator). Ported from backend/config/sarvam.js, with ffmpeg replaced
// by pure-JS WAV windowing for the mobile path. Non-WAV input (web webm etc.)
// can't be split without ffmpeg — callers fall back to Workers AI Whisper for
// those until/unless the ffmpeg Container (plan §3b) ships.

import {
  looksLikeWav,
  memoryRangeReader,
  parseWavHeader,
  wavChunks,
  wavDurationSecs,
  type RangeReader,
} from './wav.ts';
import { mapWithConcurrency, withRetry } from './retry.ts';
import type { Env } from '../types.ts';
import type { TranscriptionResult } from './whisper.ts';

const SARVAM_API_URL = 'https://api.sarvam.ai/speech-to-text';
const SARVAM_TRANSLATE_URL = 'https://api.sarvam.ai/translate';
const CHUNK_SECS = 25; // Sarvam sync limit is 30s per request
const CONCURRENCY = 8;

// Map short language names to Sarvam language codes (parity with old backend)
export const LANG_TO_SARVAM_CODE: Record<string, string> = {
  hindi: 'hi-IN', hi: 'hi-IN',
  bengali: 'bn-IN', bn: 'bn-IN',
  kannada: 'kn-IN', kn: 'kn-IN',
  malayalam: 'ml-IN', ml: 'ml-IN',
  marathi: 'mr-IN', mr: 'mr-IN',
  odia: 'od-IN', od: 'od-IN',
  punjabi: 'pa-IN', pa: 'pa-IN',
  tamil: 'ta-IN', ta: 'ta-IN',
  telugu: 'te-IN', te: 'te-IN',
  gujarati: 'gu-IN', gu: 'gu-IN',
  english: 'en-IN', en: 'en-IN',
};

interface SarvamResponse {
  transcript?: string;
  text?: string;
  language_code?: string;
}

const transcribeSarvamChunk = async (
  apiKey: string,
  bytes: Uint8Array,
  contentType: string,
  languageCode: string | null,
): Promise<SarvamResponse> =>
  withRetry(
    async () => {
      const formData = new FormData();
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      formData.append('file', new Blob([buf], { type: contentType }), 'audio.wav');
      formData.append('model', 'saarika:v2.5');
      if (languageCode) formData.append('language_code', languageCode);

      const response = await fetch(SARVAM_API_URL, {
        method: 'POST',
        headers: { 'api-subscription-key': apiKey },
        body: formData,
      });
      const rawText = await response.text();
      if (!response.ok) {
        throw new Error(`Sarvam API error ${response.status}: ${rawText}`);
      }
      return JSON.parse(rawText) as SarvamResponse;
    },
    { label: 'sarvam stt' },
  );

/** True when this audio can take the Sarvam path without ffmpeg (WAV, or short enough for one call). */
export const sarvamCanHandle = (head: Uint8Array): boolean => looksLikeWav(head);

/**
 * Transcribe WAV audio with Sarvam: 25s pure-JS windows, ~8 concurrent calls,
 * transcripts joined in order (2h audio ≈ 288 calls ≈ 40–80s wall clock).
 */
export const transcribeSarvam = async (
  env: Env,
  source: { bytes?: Uint8Array; read?: RangeReader; size: number },
  languageCode: string | null,
): Promise<TranscriptionResult> => {
  const apiKey = env.SARVAM_API_KEY;
  if (!apiKey) throw new Error('SARVAM_API_KEY is not configured');

  const read = source.read ?? memoryRangeReader(source.bytes ?? new Uint8Array(0));
  const head = await read(0, Math.min(512, source.size));
  const format = parseWavHeader(head, source.size);
  if (!format) {
    throw new Error('Sarvam path requires WAV input (non-WAV falls back to Whisper)');
  }

  const totalSecs = wavDurationSecs(format);
  const windows: { bytes: Uint8Array }[] = [];
  for await (const chunk of wavChunks(read, format, CHUNK_SECS)) {
    windows.push({ bytes: chunk.bytes });
  }

  let detectedLanguage: string | null = null;
  const texts = await mapWithConcurrency(windows, CONCURRENCY, async (w) => {
    const result = await transcribeSarvamChunk(apiKey, w.bytes, 'audio/wav', languageCode);
    if (!detectedLanguage) detectedLanguage = result.language_code ?? languageCode;
    return result.transcript ?? result.text ?? '';
  });

  return {
    text: texts.map((t) => t.trim()).filter(Boolean).join(' '),
    // Parity note: the old backend returned duration 0 from Sarvam; we return
    // the real WAV duration since callers fall back to client-supplied values.
    duration: Math.round(totalSecs),
    language: detectedLanguage,
  };
};

/** Translate text via Sarvam mayura:v1 in ~900-char chunks (verbatim port). */
export const translateText = async (
  env: Env,
  text: string,
  sourceLangCode: string,
  targetLangCode = 'en-IN',
): Promise<string> => {
  if (!text || sourceLangCode === targetLangCode) return text;
  const apiKey = env.SARVAM_API_KEY;
  if (!apiKey) throw new Error('SARVAM_API_KEY is not configured');

  const MAX_CHUNK = 900;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK) {
    chunks.push(text.slice(i, i + MAX_CHUNK));
  }

  const translated: string[] = [];
  for (const chunk of chunks) {
    const response = await fetch(SARVAM_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: chunk,
        source_language_code: sourceLangCode,
        target_language_code: targetLangCode,
        speaker_gender: 'Male',
        mode: 'formal',
        model: 'mayura:v1',
        enable_preprocessing: false,
      }),
    });

    if (!response.ok) {
      console.error(`[Sarvam Translate] Error ${response.status}: ${await response.text()}`);
      translated.push(chunk); // fall back to original chunk on error
      continue;
    }
    const data = (await response.json()) as { translated_text?: string };
    translated.push(data.translated_text ?? chunk);
  }
  return translated.join(' ');
};
