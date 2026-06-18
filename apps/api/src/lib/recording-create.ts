// Shared recording-creation seam. Both the upload paths (routes/recordings.ts)
// and the Meet bot (meet/bot-do.ts) create a recording row and hand off to the
// async pipeline through here, so the bot never duplicates insert/workflow logic.

import { newId } from '@echobit/shared/ids';
import { nowIso } from './db.ts';
import { putDerivedText } from './derived.ts';
import type { Env, RecordingRow } from '../types.ts';

export interface NewRecording {
  userId: string;
  title: string;
  audioKey?: string | null;
  audioSize?: number;
  audioMimeType?: string;
  duration?: number;
  transcript?: string;
  status?: RecordingRow['status'];
}

export const insertRecording = async (env: Env, r: NewRecording): Promise<RecordingRow> => {
  const ts = nowIso();
  const id = newId();
  const transcript = r.transcript ?? '';
  const row: RecordingRow = {
    id,
    user_id: r.userId,
    title: r.title,
    audio_key: r.audioKey ?? null,
    audio_size: r.audioSize ?? 0,
    audio_mime_type: r.audioMimeType ?? 'audio/webm',
    duration: Math.round(r.duration ?? 0),
    transcript_chars: transcript.length,
    summary_chars: 0,
    minutes_chars: 0,
    action_items: '[]',
    status: r.status ?? 'pending',
    tags: '[]',
    metadata: '{}',
    created_at: ts,
    updated_at: ts,
  };
  await env.DB.prepare(
    `INSERT INTO recordings (
      id, user_id, title, audio_key, audio_size, audio_mime_type, duration,
      transcript_chars, action_items, status, tags, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id, row.user_id, row.title, row.audio_key, row.audio_size,
      row.audio_mime_type, row.duration, row.transcript_chars,
      row.action_items, row.status, row.tags, row.metadata, row.created_at, row.updated_at,
    )
    .run();
  if (transcript) await putDerivedText(env, 'transcript', r.userId, id, transcript);
  return row;
};

/**
 * Create a recording from an audio object already stored in R2 and start the
 * async pipeline. With `autoProcess`, the workflow also runs summary/minutes/
 * actions (gated by plan) and emails the user — the Meet bot's "do the rest".
 */
export const createRecordingFromAudio = async (
  env: Env,
  args: {
    userId: string;
    audioKey: string;
    audioSize: number;
    audioMimeType: string;
    duration: number;
    title: string;
    autoProcess?: boolean;
  },
): Promise<RecordingRow> => {
  const recording = await insertRecording(env, {
    userId: args.userId,
    title: args.title,
    audioKey: args.audioKey,
    audioSize: args.audioSize,
    audioMimeType: args.audioMimeType,
    duration: args.duration,
    status: 'transcribing',
  });
  await env.TRANSCRIBE_WF.create({
    params: {
      task: 'transcribe',
      recordingId: recording.id,
      userId: args.userId,
      autoProcess: args.autoProcess ?? false,
    },
  });
  return recording;
};
