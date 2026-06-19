// MeetingBot orchestrator (Durable Object). Owns one meeting bot's lifecycle:
// schedules the join (alarm), drives the headless-Chrome container (meet/
// container.ts), and on completion streams the captured WAV into R2 and hands
// off to the shared recording pipeline with autoProcess (transcript → summary →
// minutes → actions → email).
//
// Single alarm, polling model: the alarm fires the scheduled join, then polls
// the container's /status every POLL_MS. Each poll is also what keeps the
// container instance warm for the duration of the call.

import { DurableObject } from 'cloudflare:workers';
import { updateRow } from '../lib/db.ts';
import { uploadAudio } from '../lib/storage.ts';
import { createRecordingFromAudio } from '../lib/recording-create.ts';
import { logError } from '../lib/log-error.ts';
import type { Env, MeetingBotStatus } from '../types.ts';

const POLL_MS = 60_000; // status poll cadence (also keeps the container warm)
const ADMIT_TIMEOUT_MS = 5 * 60_000; // give up if not admitted from the waiting room
const FINALIZE_BUFFER_MS = 60_000; // grace past max duration before forcing a stop

interface BotParams {
  meetingBotId: string;
  userId: string;
  meetingUrl: string;
  title: string;
  botName: string;
  maxDurationSecs: number;
}

type ContainerState = 'joining' | 'waiting' | 'recording' | 'done' | 'error';
interface ContainerStatus {
  state: ContainerState;
  durationSecs?: number;
  error?: string;
}

const CONTAINER_TO_DB: Record<ContainerState, MeetingBotStatus | null> = {
  joining: 'joining',
  waiting: 'waiting',
  recording: 'recording',
  done: null, // handled by finalize
  error: null, // handled by fail
};

export class MeetingBot extends DurableObject<Env> {
  private container() {
    return this.env.MEET_BOT_CONTAINER.getByName(this.ctx.id.toString());
  }

  // Persisted Google session for the dedicated bot account (Playwright
  // storageState), uploaded once to R2. Absent → the bot joins as a guest.
  private async loadSession(): Promise<string> {
    try {
      const obj = await this.env.BUCKET.get('meet-bot/google-session.json');
      return obj ? await obj.text() : '';
    } catch {
      return '';
    }
  }

  private async setDbStatus(id: string, status: MeetingBotStatus, extra: Record<string, string | number | null> = {}) {
    await updateRow(this.env, 'meeting_bots', id, { status, ...extra });
  }

  /** Schedule the bot. `scheduledAtMs` in the future delays the join; otherwise it starts now. */
  async schedule(params: BotParams, scheduledAtMs: number | null): Promise<void> {
    await this.ctx.storage.put('params', params);
    await this.ctx.storage.put('phase', 'start');
    const at = scheduledAtMs && scheduledAtMs > Date.now() ? scheduledAtMs : Date.now();
    await this.ctx.storage.setAlarm(at);
  }

  /** Cancel a scheduled or in-flight bot. */
  async cancel(): Promise<void> {
    const params = await this.ctx.storage.get<BotParams>('params');
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.put('phase', 'done');
    await this.stopContainer();
    if (params) await this.setDbStatus(params.meetingBotId, 'cancelled');
  }

  override async alarm(): Promise<void> {
    const phase = await this.ctx.storage.get<string>('phase');
    if (phase === 'start') return this.beginJoin();
    if (phase === 'poll') return this.poll();
  }

  private async beginJoin(): Promise<void> {
    const params = await this.ctx.storage.get<BotParams>('params');
    if (!params) return;

    const attempts = ((await this.ctx.storage.get<number>('joinAttempts')) ?? 0) + 1;
    await this.ctx.storage.put('joinAttempts', attempts);
    await this.setDbStatus(params.meetingBotId, 'joining');

    const storageState = await this.loadSession();

    try {
      const res = await this.container().fetch(
        new Request('http://meet/join', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            meetingUrl: params.meetingUrl,
            botName: params.botName,
            maxDurationSecs: params.maxDurationSecs,
            storageState,
          }),
        }),
      );
      if (!res.ok) throw new Error(`join failed (${res.status}): ${await res.text().catch(() => '')}`);
    } catch (e) {
      // The container may still be cold/provisioning — retry before giving up.
      if (attempts < 6) {
        await this.ctx.storage.setAlarm(Date.now() + 30_000);
        return;
      }
      return this.fail(params, `Could not start the meeting bot: ${(e as Error).message}`);
    }

    await this.ctx.storage.put('startedAt', Date.now());
    await this.ctx.storage.put('phase', 'poll');
    await this.ctx.storage.setAlarm(Date.now() + POLL_MS);
  }

  private async poll(): Promise<void> {
    const params = await this.ctx.storage.get<BotParams>('params');
    if (!params) return;
    const startedAt = (await this.ctx.storage.get<number>('startedAt')) ?? Date.now();
    const elapsed = Date.now() - startedAt;

    let status: ContainerStatus;
    try {
      const res = await this.container().fetch(new Request('http://meet/status'));
      status = (await res.json()) as ContainerStatus;
    } catch (e) {
      // Transient container error — keep polling unless we've blown the cap.
      if (elapsed > (params.maxDurationSecs * 1000) + FINALIZE_BUFFER_MS) {
        return this.fail(params, `Lost contact with the meeting bot: ${(e as Error).message}`);
      }
      await this.ctx.storage.setAlarm(Date.now() + POLL_MS);
      return;
    }

    if (status.state === 'error') {
      return this.fail(params, status.error || 'The meeting bot reported an error');
    }
    if (status.state === 'done') {
      return this.finalize(params, status.durationSecs ?? Math.round(elapsed / 1000));
    }

    // Still joining/waiting/recording — reflect it, enforce timeouts, keep polling.
    const dbStatus = CONTAINER_TO_DB[status.state];
    if (dbStatus) await this.setDbStatus(params.meetingBotId, dbStatus);

    if (status.state === 'waiting' && elapsed > ADMIT_TIMEOUT_MS) {
      return this.fail(params, 'The bot was not admitted to the meeting in time. Make sure to admit "' + params.botName + '".');
    }
    if (elapsed > (params.maxDurationSecs * 1000) + FINALIZE_BUFFER_MS) {
      return this.finalize(params, params.maxDurationSecs);
    }

    await this.ctx.storage.setAlarm(Date.now() + POLL_MS);
  }

  private async finalize(params: BotParams, durationSecs: number): Promise<void> {
    await this.ctx.storage.put('phase', 'done');
    await this.ctx.storage.deleteAlarm();

    try {
      await this.setDbStatus(params.meetingBotId, 'uploading');
      const audioRes = await this.container().fetch(new Request('http://meet/audio'));
      if (!audioRes.ok || !audioRes.body) {
        throw new Error(`no audio (${audioRes.status})`);
      }
      const { key, size } = await uploadAudio(this.env, audioRes.body, params.userId, 'audio/wav');
      if (size < 1000) throw new Error('captured audio was empty');

      const recording = await createRecordingFromAudio(this.env, {
        userId: params.userId,
        audioKey: key,
        audioSize: size,
        audioMimeType: 'audio/wav',
        duration: durationSecs,
        title: params.title,
        autoProcess: true,
      });

      await this.setDbStatus(params.meetingBotId, 'processing', {
        recording_id: recording.id,
        duration_secs: durationSecs,
        error: null,
      });
    } catch (e) {
      return this.fail(params, `Could not save the recording: ${(e as Error).message}`);
    } finally {
      await this.stopContainer();
    }
  }

  private async fail(params: BotParams, message: string): Promise<void> {
    await this.ctx.storage.put('phase', 'done');
    await this.ctx.storage.deleteAlarm();
    await this.stopContainer();
    await this.setDbStatus(params.meetingBotId, 'failed', { error: message.slice(0, 500) });
    await logError(this.env, 'meeting_bot_failed', message, { userId: params.userId });
  }

  private async stopContainer(): Promise<void> {
    try {
      await this.container().fetch(new Request('http://meet/stop', { method: 'POST' }));
    } catch {
      // best-effort — the container scales to zero on its own
    }
  }
}
