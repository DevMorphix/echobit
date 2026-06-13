// ffmpeg transcode via a Cloudflare Container sidecar. Streams an R2 audio
// object through the container (container/server.ts) and writes the resulting
// 16 kHz mono WAV to a temp R2 key, so the Worker never buffers a whole
// multi-hour file. Callers run the existing Sarvam path on the returned key,
// then delete it.

import { Container } from '@cloudflare/containers';
import { newId } from '@echobit/shared/ids';
import type { Env } from '../types.ts';

export class FfmpegContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '5m'; // scale to zero — no idle charges between recordings
}

const TEMP_PREFIX = 'uploads/tmp/';

/**
 * Transcode the R2 object at `sourceKey` to WAV, stage it under uploads/tmp/
 * (the lifecycle rule purges that prefix after a day as a backstop), and
 * return the new key. Throws on any container/transcode failure so the caller
 * can fall back to Whisper.
 */
export const transcodeToWav = async (
  env: Env,
  sourceKey: string,
  userId: string,
): Promise<string> => {
  const obj = await env.BUCKET.get(sourceKey);
  if (!obj) throw new Error(`Audio object not found for transcode: ${sourceKey}`);

  // Instance keyed by source so retries/concurrent recordings don't serialize
  const container = env.FFMPEG.getByName(sourceKey);
  const res = await container.fetch(
    new Request('http://ffmpeg/transcode', { method: 'POST', body: obj.body }),
  );
  if (!res.ok || !res.body) {
    throw new Error(`Transcode failed (${res.status}): ${await res.text().catch(() => '')}`);
  }

  const wavKey = `${TEMP_PREFIX}${userId}/${newId()}.wav`;
  await env.BUCKET.put(wavKey, res.body);
  return wavKey;
};
