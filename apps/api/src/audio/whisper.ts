// Speech-to-text on Workers AI (@cf/openai/whisper-large-v3-turbo) — replaces
// the OpenAI Whisper API (~12× cheaper per audio-minute). Long WAV files are
// split into 10-minute windows with pure-JS PCM math (audio/wav.ts); compressed
// formats (webm/mp3/m4a) are sent whole as base64.

import {
  isWavMime,
  looksLikeWav,
  memoryRangeReader,
  parseWavHeader,
  wavChunks,
  wavDurationSecs,
  type RangeReader,
  type WavFormat,
} from './wav.ts';
import { mapWithConcurrency, withRetry } from './retry.ts';
import type { Env } from '../types.ts';

const WHISPER_MODEL = '@cf/openai/whisper-large-v3-turbo';
const CHUNK_SECS = 600; // 10 minutes — parity with backend/config/transcription.js
const CONCURRENCY = 3;

export interface TranscriptionResult {
  text: string;
  duration: number;
  language: string | null;
}

const toBase64 = (bytes: Uint8Array): string => {
  // Chunked conversion avoids call-stack limits on large buffers
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
};

interface WhisperResponse {
  text?: string;
  transcription_info?: { duration?: number; language?: string };
  segments?: unknown[];
}

const runWhisper = async (env: Env, bytes: Uint8Array): Promise<WhisperResponse> =>
  withRetry(
    () =>
      env.AI.run(WHISPER_MODEL as keyof AiModels, { audio: toBase64(bytes) }) as Promise<WhisperResponse>,
    { label: 'workers-ai whisper' },
  );

const transcribeWavChunked = async (
  env: Env,
  read: RangeReader,
  format: WavFormat,
): Promise<TranscriptionResult> => {
  const chunks: { bytes: Uint8Array; duration: number }[] = [];
  for await (const chunk of wavChunks(read, format, CHUNK_SECS)) {
    chunks.push({ bytes: chunk.bytes, duration: chunk.duration });
  }

  const results = await mapWithConcurrency(chunks, CONCURRENCY, async (chunk) => {
    const res = await runWhisper(env, chunk.bytes);
    return {
      text: res.text ?? '',
      duration: res.transcription_info?.duration ?? chunk.duration,
      language: res.transcription_info?.language ?? null,
    };
  });

  return {
    text: results.map((r) => r.text.trim()).filter(Boolean).join(' '),
    duration: Math.round(results.reduce((n, r) => n + r.duration, 0)),
    language: results.find((r) => r.language)?.language ?? null,
  };
};

/**
 * Transcribe audio bytes. WAV is windowed via ranged reads (memory-safe for
 * multi-hour PCM); other formats go up whole.
 */
export const transcribeWhisper = async (
  env: Env,
  source: { bytes?: Uint8Array; read?: RangeReader; size: number },
  mimeType: string,
): Promise<TranscriptionResult> => {
  const read = source.read ?? memoryRangeReader(source.bytes ?? new Uint8Array(0));
  const head = await read(0, Math.min(512, source.size));

  if (isWavMime(mimeType) || looksLikeWav(head)) {
    const format = parseWavHeader(head, source.size);
    if (format) {
      if (wavDurationSecs(format) > CHUNK_SECS) {
        return transcribeWavChunked(env, read, format);
      }
      const bytes = source.bytes ?? (await read(0, source.size));
      const res = await runWhisper(env, bytes);
      return {
        text: res.text ?? '',
        duration: Math.round(res.transcription_info?.duration ?? wavDurationSecs(format)),
        language: res.transcription_info?.language ?? null,
      };
    }
  }

  const bytes = source.bytes ?? (await read(0, source.size));
  const res = await runWhisper(env, bytes);
  return {
    text: res.text ?? '',
    duration: Math.round(res.transcription_info?.duration ?? 0),
    language: res.transcription_info?.language ?? null,
  };
};
