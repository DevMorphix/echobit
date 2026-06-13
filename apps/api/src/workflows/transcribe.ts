// Durable transcription pipeline (Cloudflare Workflows) — the async path for
// recording transcription. Each step checkpoints independently, so a failure
// in title generation or the final save retries from that step instead of
// re-running (and re-billing) Sarvam/Whisper transcription.

import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';
import { getUserById, updateRow } from '../lib/db.ts';
import { logError } from '../lib/log-error.ts';
import { r2AudioSource, transcribeAudio } from '../audio/pipeline.ts';
import { generateTitle } from '../audio/gemini.ts';
import type { Env, JobMessage, RecordingRow } from '../types.ts';

const TEMP_PREFIX = 'uploads/tmp/';

export class TranscriptionWorkflow extends WorkflowEntrypoint<Env, JobMessage> {
  override async run(event: WorkflowEvent<JobMessage>, step: WorkflowStep): Promise<void> {
    const { recordingId, userId } = event.payload;

    try {
      const transcribed = await step.do(
        'transcribe',
        { retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' }, timeout: '15 minutes' },
        async () => {
          const recording = await this.env.DB.prepare('SELECT * FROM recordings WHERE id = ?')
            .bind(recordingId)
            .first<RecordingRow>();
          if (!recording || !recording.audio_key) {
            throw new NonRetryableError(`Recording gone or has no audio: ${recordingId}`);
          }

          const userRow = await getUserById(this.env, userId);
          const source = await r2AudioSource(this.env, recording.audio_key);
          if (!source) throw new Error(`Audio object not found: ${recording.audio_key}`);

          const result = await transcribeAudio(this.env, source, recording.audio_mime_type, userRow, recording.audio_key);
          return {
            text: result.text,
            duration: Math.round(result.duration || recording.duration),
            audioKey: recording.audio_key,
            title: recording.title,
          };
        },
      );

      // tempUpload (cloudSync off): audio was only staged for processing
      const isTemp = transcribed.audioKey.startsWith(TEMP_PREFIX);
      if (isTemp) {
        await step.do('cleanup-temp-audio', async () => {
          await this.env.BUCKET.delete(transcribed.audioKey).catch(() => {});
        });
      }

      let title: string | undefined;
      if (/^Recording \d/.test(transcribed.title) && transcribed.text.length > 20 && this.env.GEMINI_API_KEY) {
        // Best-effort: a title failure must never fail the workflow
        const generated = await step.do('generate-title', async () =>
          generateTitle(this.env, transcribed.text).catch(() => null),
        );
        title = generated ?? undefined;
      }

      await step.do('save', async () => {
        await updateRow(this.env, 'recordings', recordingId, {
          transcript: transcribed.text,
          duration: transcribed.duration,
          status: 'transcribed',
          title,
          audio_key: isTemp ? null : undefined,
          audio_url: isTemp ? null : undefined,
        });
      });
    } catch (err) {
      // Exhausted retries: mark failed + log (was the queue's DLQ behavior)
      await step.do('mark-failed', async () => {
        await updateRow(this.env, 'recordings', recordingId, { status: 'failed' });
        await logError(this.env, 'transcription_failed', (err as Error).message, {
          userId,
          recordingId,
        });
      });
      throw err;
    }
  }
}
