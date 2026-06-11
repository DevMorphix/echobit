// Unit tests for the pure-JS audio primitives that replaced ffmpeg, the
// mobile chunk-protocol base64 decoder, and the Mongoose-shape serializer.

import { describe, expect, test } from 'bun:test';
import {
  buildWavHeader,
  memoryRangeReader,
  parseWavHeader,
  wavChunks,
  wavDurationSecs,
  looksLikeWav,
} from '../src/audio/wav.ts';
import { Base64StreamDecoder } from '../src/audio/staging.ts';
import { serializeRecording, serializeRecordingLean } from '../src/lib/serialize.ts';
import type { RecordingRow } from '../src/types.ts';

/** Synthesize a PCM-16 WAV of `secs` seconds. */
const makeWav = (secs: number, sampleRate = 44_100, channels = 2): Uint8Array => {
  const frames = secs * sampleRate;
  const data = new Int16Array(frames * channels);
  for (let i = 0; i < frames; i++) {
    const sample = Math.round(Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 16_000);
    for (let ch = 0; ch < channels; ch++) data[i * channels + ch] = sample;
  }
  const pcm = new Uint8Array(data.buffer);
  const header = buildWavHeader(pcm.length, sampleRate, channels, 16);
  const wav = new Uint8Array(header.length + pcm.length);
  wav.set(header, 0);
  wav.set(pcm, header.length);
  return wav;
};

describe('wav', () => {
  test('parses header and computes duration', () => {
    const wav = makeWav(10);
    expect(looksLikeWav(wav)).toBe(true);
    const format = parseWavHeader(wav.subarray(0, 512), wav.length);
    expect(format).not.toBeNull();
    expect(format!.sampleRate).toBe(44_100);
    expect(format!.channels).toBe(2);
    expect(format!.bitsPerSample).toBe(16);
    expect(Math.round(wavDurationSecs(format!))).toBe(10);
  });

  test('handles bogus data-chunk size by bounding to file length', () => {
    const wav = makeWav(2);
    // Zero the declared data size (some recorders write 0 while streaming)
    new DataView(wav.buffer).setUint32(40, 0, true);
    const format = parseWavHeader(wav.subarray(0, 512), wav.length);
    expect(format!.dataLength).toBe(wav.length - 44);
  });

  test('chunks a 60s file into 25s windows that are standalone WAVs', async () => {
    const wav = makeWav(60);
    const format = parseWavHeader(wav.subarray(0, 512), wav.length)!;
    const chunks = [];
    for await (const chunk of wavChunks(memoryRangeReader(wav), format, 25)) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBe(3); // 25 + 25 + 10
    expect(chunks[2]!.duration).toBeCloseTo(10, 0);

    // Each chunk reparses as valid 16kHz-mono WAV (downsampled from 44.1k stereo)
    for (const chunk of chunks) {
      const f = parseWavHeader(chunk.bytes.subarray(0, 512), chunk.bytes.length);
      expect(f).not.toBeNull();
      expect(f!.sampleRate).toBe(16_000);
      expect(f!.channels).toBe(1);
      expect(wavDurationSecs(f!)).toBeCloseTo(chunk.duration, 0);
    }
  });

  test('downsampling shrinks bytes ~5.5x (44.1k stereo → 16k mono)', async () => {
    const wav = makeWav(25);
    const format = parseWavHeader(wav.subarray(0, 512), wav.length)!;
    const [chunk] = [];
    for await (const c of wavChunks(memoryRangeReader(wav), format, 25)) {
      expect(c.bytes.length).toBeLessThan(wav.length / 5);
    }
  });
});

describe('Base64StreamDecoder (mobile chunk protocol)', () => {
  test('decodes data-URL split at non-4-aligned boundaries', () => {
    const original = new Uint8Array(1000).map((_, i) => (i * 7 + 13) % 256);
    let b64 = '';
    for (let i = 0; i < original.length; i += 0x8000) {
      b64 += btoa(String.fromCharCode(...original.subarray(i, i + 0x8000)));
    }
    const dataUrl = `data:audio/wav;base64,${b64}`;

    // 5 deliberately misaligned slices (mobile slices by char count, not groups)
    const sliceAt = [0, 111, 222, 555, 999, dataUrl.length];
    const decoder = new Base64StreamDecoder();
    const out: number[] = [];
    for (let i = 0; i < sliceAt.length - 1; i++) {
      const piece = dataUrl.slice(sliceAt[i], sliceAt[i + 1]);
      out.push(...decoder.push(piece, i === sliceAt.length - 2));
    }
    expect(new Uint8Array(out)).toEqual(original);
  });
});

describe('serializer (Mongoose-shape parity)', () => {
  const row: RecordingRow = {
    id: 'abc123',
    user_id: 'user456',
    title: 'Test',
    audio_key: 'audio/user456/x.wav',
    audio_url: null,
    audio_size: 1234,
    audio_mime_type: 'audio/wav',
    duration: 125,
    transcript: 'hello',
    summary: '',
    minutes: '',
    action_items: '[{"task":"do it","priority":"high"}]',
    status: 'transcribed',
    tags: '["a"]',
    metadata: '{}',
    created_at: '2026-06-12T10:00:00.000Z',
    updated_at: '2026-06-12T10:00:00.000Z',
  };

  test('document shape includes virtuals (id, formattedDuration) and _id/user', () => {
    const doc = serializeRecording(row);
    expect(doc._id).toBe('abc123');
    expect(doc.id).toBe('abc123');
    expect(doc.user).toBe('user456');
    expect(doc.formattedDuration).toBe('2:05');
    expect(doc.actionItems).toEqual([{ task: 'do it', priority: 'high' }]);
    expect(doc.__v).toBe(0);
    expect(doc.createdAt).toBe('2026-06-12T10:00:00.000Z');
  });

  test('lean shape (list route) lacks the virtuals — pinned asymmetry', () => {
    const lean = serializeRecordingLean(row) as Record<string, unknown>;
    expect(lean._id).toBe('abc123');
    expect('id' in lean).toBe(false);
    expect('formattedDuration' in lean).toBe(false);
  });
});
