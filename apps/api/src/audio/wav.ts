// Pure-JS WAV (RIFF/PCM) parsing, slicing and downsampling — replaces ffmpeg
// for the dominant mobile path (capacitor-voice-recorder produces WAV).
// Slicing raw PCM is byte arithmetic: bytesPerSecond = rate × channels × bits/8.

export interface WavFormat {
  audioFormat: number; // 1 = PCM
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  /** Byte offset of the start of PCM data (after the `data` chunk header). */
  dataOffset: number;
  /** Byte length of PCM data. */
  dataLength: number;
}

const readU32 = (b: Uint8Array, o: number): number =>
  ((b[o] ?? 0) | ((b[o + 1] ?? 0) << 8) | ((b[o + 2] ?? 0) << 16) | ((b[o + 3] ?? 0) << 24)) >>> 0;
const readU16 = (b: Uint8Array, o: number): number => (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8);
const tag = (b: Uint8Array, o: number): string => String.fromCharCode(...b.subarray(o, o + 4));

export const isWavMime = (mimeType: string | null | undefined): boolean => {
  const m = (mimeType ?? '').toLowerCase();
  return m.includes('audio/wav') || m.includes('audio/wave') || m.includes('audio/x-wav');
};

export const looksLikeWav = (head: Uint8Array): boolean =>
  head.length >= 12 && tag(head, 0) === 'RIFF' && tag(head, 8) === 'WAVE';

/**
 * Parse the RIFF header (walks chunks until `data`). `head` only needs the
 * first few hundred bytes; `totalLength` bounds the data chunk for truncated
 * size fields (some recorders write 0/0xFFFFFFFF).
 */
export const parseWavHeader = (head: Uint8Array, totalLength: number): WavFormat | null => {
  if (!looksLikeWav(head)) return null;

  let offset = 12;
  let fmt: Omit<WavFormat, 'dataOffset' | 'dataLength'> | null = null;

  while (offset + 8 <= head.length) {
    const chunkId = tag(head, offset);
    const chunkSize = readU32(head, offset + 4);

    if (chunkId === 'fmt ') {
      fmt = {
        audioFormat: readU16(head, offset + 8),
        channels: readU16(head, offset + 10),
        sampleRate: readU32(head, offset + 12),
        bitsPerSample: readU16(head, offset + 22),
      };
    } else if (chunkId === 'data') {
      if (!fmt) return null;
      const dataOffset = offset + 8;
      const declared = chunkSize;
      const available = totalLength - dataOffset;
      const dataLength =
        declared > 0 && declared <= available ? declared : Math.max(0, available);
      return { ...fmt, dataOffset, dataLength };
    }
    offset += 8 + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }
  return null;
};

export const wavDurationSecs = (f: WavFormat): number => {
  const bytesPerSecond = f.sampleRate * f.channels * (f.bitsPerSample / 8);
  return bytesPerSecond > 0 ? f.dataLength / bytesPerSecond : 0;
};

/** Build a standard 44-byte PCM WAV header. */
export const buildWavHeader = (
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
): Uint8Array => {
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;

  header.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  view.setUint32(4, 36 + dataLength, true);
  header.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
  header.set([0x66, 0x6d, 0x74, 0x20], 12); // fmt(space)
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  header.set([0x64, 0x61, 0x74, 0x61], 36); // data
  view.setUint32(40, dataLength, true);
  return header;
};

/** Async byte-range reader so chunks can come from R2 ranged reads or memory. */
export type RangeReader = (offset: number, length: number) => Promise<Uint8Array>;

export const memoryRangeReader = (bytes: Uint8Array): RangeReader => async (offset, length) =>
  bytes.subarray(offset, offset + length);

const TARGET_RATE = 16_000;

/**
 * Downsample 16-bit PCM to 16 kHz mono (nearest-neighbor). Returns the input
 * data unchanged for non-16-bit audio (still a valid WAV slice).
 */
const downsamplePcm16 = (
  data: Uint8Array,
  sampleRate: number,
  channels: number,
): { data: Uint8Array; sampleRate: number; channels: number } => {
  if (sampleRate <= TARGET_RATE && channels === 1) return { data, sampleRate, channels };

  const src = new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
  const srcFrames = Math.floor(src.length / channels);
  const outRate = Math.min(sampleRate, TARGET_RATE);
  const outFrames = Math.floor((srcFrames * outRate) / sampleRate);
  const out = new Int16Array(outFrames);

  for (let i = 0; i < outFrames; i++) {
    const srcFrame = Math.min(srcFrames - 1, Math.floor((i * sampleRate) / outRate));
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) sum += src[srcFrame * channels + ch] ?? 0;
    out[i] = (sum / channels) | 0;
  }
  return {
    data: new Uint8Array(out.buffer, 0, out.length * 2),
    sampleRate: outRate,
    channels: 1,
  };
};

export interface WavChunk {
  /** Complete standalone WAV file bytes for this window. */
  bytes: Uint8Array;
  startTime: number;
  duration: number;
}

/**
 * Slice a WAV into self-contained chunks of `chunkSecs`, reading only the
 * window's byte range each iteration (peak memory ≈ one chunk). 16-bit PCM is
 * downsampled to 16 kHz mono (≈ what ffmpeg produced for the STT providers).
 */
export async function* wavChunks(
  read: RangeReader,
  format: WavFormat,
  chunkSecs: number,
): AsyncGenerator<WavChunk> {
  const blockAlign = format.channels * (format.bitsPerSample / 8);
  const bytesPerSecond = format.sampleRate * blockAlign;
  const totalSecs = wavDurationSecs(format);

  for (let start = 0; start < totalSecs; start += chunkSecs) {
    const windowSecs = Math.min(chunkSecs, totalSecs - start);
    // Align to whole frames
    let byteStart = Math.floor((start * bytesPerSecond) / blockAlign) * blockAlign;
    let byteLength = Math.floor((windowSecs * bytesPerSecond) / blockAlign) * blockAlign;
    byteLength = Math.min(byteLength, format.dataLength - byteStart);
    if (byteLength <= 0) return;

    const raw = await read(format.dataOffset + byteStart, byteLength);

    let data = raw;
    let rate = format.sampleRate;
    let channels = format.channels;
    if (format.audioFormat === 1 && format.bitsPerSample === 16) {
      const ds = downsamplePcm16(raw, format.sampleRate, format.channels);
      data = ds.data;
      rate = ds.sampleRate;
      channels = ds.channels;
    }

    const header = buildWavHeader(data.length, rate, channels, format.bitsPerSample);
    const bytes = new Uint8Array(header.length + data.length);
    bytes.set(header, 0);
    bytes.set(data, header.length);

    yield { bytes, startTime: start, duration: windowSecs };
  }
}
