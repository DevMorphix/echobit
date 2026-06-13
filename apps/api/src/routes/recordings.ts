// Recordings routes — exact contract port of backend/routes/recordings.js.
// Mounted behind authenticateToken (parity with server.js).
//
// Pipeline execution modes:
// - Legacy sync (published mobile app): POST /, /finalize-upload and
//   /:id/transcribe await the shared pipeline in-request.
// - Async (new web client sends `async: true`): TranscriptionWorkflow instance
//   created, response returns immediately with status "transcribing"; client
//   polls GET /:id. Same pipeline function either way.

import { Hono } from 'hono';
import { newId } from '@echobit/shared/ids';
import { getActivePlan, getPlanLimits, type PlanLimits } from '@echobit/shared/plan-limits';
import { serializeRecording, serializeRecordingLean } from '../lib/serialize.ts';
import {
  countRecordingsThisMonth,
  getRecordingForUser,
  getUserById,
  nowIso,
  sumStorageUsed,
  updateRow,
} from '../lib/db.ts';
import { getEffectiveLimits, userPlanView } from '../lib/limits.ts';
import { deleteAudio, getAudioUrl, getUploadUrl, hasR2Credentials, uploadAudio } from '../lib/storage.ts';
import { logError } from '../lib/log-error.ts';
import { parseBody, schemas } from '../lib/validate.ts';
import {
  assembleUpload,
  deleteStagedUpload,
  estimateAssembledSize,
  findMissingChunk,
  getUploadMeta,
  putChunk,
} from '../audio/staging.ts';
import { r2AudioSource, transcribeAudio, toEnglishTranscript, toPreferredLanguage } from '../audio/pipeline.ts';
import { extractActionItems, generateMeetingMinutes, generateSummary, generateTitle } from '../audio/gemini.ts';
import type { Env, HonoEnv, RecordingRow, UserRow } from '../types.ts';

const recordings = new Hono<HonoEnv>();

const MAX_CHUNK_BODY = 7 * 1024 * 1024; // 5 MB base64 chunk + JSON envelope headroom

// ─── Plan limit helpers (ported) ────────────────────────────────────────────

interface LimitCheck {
  ok: boolean;
  status?: 403;
  error?: string;
  code?: string;
}

const checkCreateLimits = async (
  env: Env,
  userId: string,
  userRow: UserRow | null,
  durationSecs: number,
  incomingBytes: number,
): Promise<LimitCheck & { limits: PlanLimits }> => {
  const planUser = userRow ? userPlanView(userRow) : null;
  const limits = await getEffectiveLimits(env, planUser ?? { plan: 'free', planExpiresAt: null, featureOverrides: null });

  if (limits.recordingsPerMonth !== null) {
    const count = await countRecordingsThisMonth(env, userId);
    if (count >= limits.recordingsPerMonth) {
      return {
        ok: false,
        status: 403,
        error: `You've reached the ${limits.recordingsPerMonth} recordings/month limit on your current plan. Upgrade to unlock more recordings.`,
        code: 'PLAN_LIMIT_RECORDINGS',
        limits,
      };
    }
  }

  if (durationSecs && durationSecs > limits.maxDurationSecs) {
    const maxMins = Math.floor(limits.maxDurationSecs / 60);
    return {
      ok: false,
      status: 403,
      error: `Recording is ${Math.ceil(durationSecs / 60)} min — exceeds the ${maxMins} min limit on your plan. Upgrade to Pro for up to 3 hours.`,
      code: 'PLAN_LIMIT_DURATION',
      limits,
    };
  }

  if (incomingBytes > 0) {
    const used = await sumStorageUsed(env, userId);
    if (used + incomingBytes > limits.maxStorageBytes) {
      const limitGB = (limits.maxStorageBytes / 1_073_741_824).toFixed(0);
      return {
        ok: false,
        status: 403,
        error: `Storage limit of ${limitGB} GB reached. Delete old recordings or upgrade your plan.`,
        code: 'PLAN_LIMIT_STORAGE',
        limits,
      };
    }
  }

  return { ok: true, limits };
};

// ─── Row insert helper ──────────────────────────────────────────────────────

interface NewRecording {
  userId: string;
  title: string;
  audioKey?: string | null;
  audioUrl?: string | null;
  audioSize?: number;
  audioMimeType?: string;
  duration?: number;
  transcript?: string;
  status?: RecordingRow['status'];
}

const insertRecording = async (env: Env, r: NewRecording): Promise<RecordingRow> => {
  const ts = nowIso();
  const row: RecordingRow = {
    id: newId(),
    user_id: r.userId,
    title: r.title,
    audio_key: r.audioKey ?? null,
    audio_url: r.audioUrl ?? null,
    audio_size: r.audioSize ?? 0,
    audio_mime_type: r.audioMimeType ?? 'audio/webm',
    duration: Math.round(r.duration ?? 0),
    transcript: r.transcript ?? '',
    summary: '',
    minutes: '',
    action_items: '[]',
    status: r.status ?? 'pending',
    tags: '[]',
    metadata: '{}',
    created_at: ts,
    updated_at: ts,
  };
  await env.DB.prepare(
    `INSERT INTO recordings (
      id, user_id, title, audio_key, audio_url, audio_size, audio_mime_type, duration,
      transcript, summary, minutes, action_items, status, tags, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id, row.user_id, row.title, row.audio_key, row.audio_url, row.audio_size,
      row.audio_mime_type, row.duration, row.transcript, row.summary, row.minutes,
      row.action_items, row.status, row.tags, row.metadata, row.created_at, row.updated_at,
    )
    .run();
  return row;
};

const defaultTitle = (): string =>
  `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

// ─── Chunked upload (mobile protocol — contract frozen) ─────────────────────

recordings.post('/upload-chunk', async (c) => {
  try {
    const contentLength = parseInt(c.req.header('content-length') ?? '0', 10);
    if (contentLength > MAX_CHUNK_BODY) {
      return c.json({ error: 'Chunk too large' }, 413);
    }

    // Schema enforces types and bounds chunkIndex/totalChunks (≤500) so a
    // hostile payload can't drive unbounded staging keys or finalize loops.
    const body = await parseBody(c.req, schemas.uploadChunk);
    if (!body) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    const { uploadId, chunkIndex, totalChunks, chunk } = body;

    // Staged under the caller's userId — another user's same uploadId can't collide
    await putChunk(c.env, c.get('user').id, uploadId, chunkIndex, totalChunks, chunk);
    return c.json({ ok: true, received: chunkIndex });
  } catch (error) {
    console.error('Chunk upload error:', error);
    return c.json({ error: 'Failed to store chunk' }, 500);
  }
});

recordings.post('/finalize-upload', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.finalizeUpload);
    const { uploadId, duration, mimeType, title } = body ?? {};
    const userId = c.get('user').id;

    const meta = uploadId ? await getUploadMeta(c.env, userId, uploadId) : null;
    if (!uploadId || !meta) return c.json({ error: 'Upload not found or expired' }, 404);

    // Plan limit checks before assembling
    const userRow = await getUserById(c.env, userId);
    const assembledSize = await estimateAssembledSize(c.env, userId, uploadId);
    const check = await checkCreateLimits(c.env, userId, userRow, duration || 0, assembledSize);
    if (!check.ok) {
      await deleteStagedUpload(c.env, userId, uploadId);
      return c.json({ error: check.error, code: check.code }, check.status ?? 403);
    }

    const missing = await findMissingChunk(c.env, userId, uploadId, meta.totalChunks);
    if (missing !== -1) return c.json({ error: `Missing chunk ${missing}` }, 400);

    const { key, size } = await assembleUpload(
      c.env,
      userId,
      uploadId,
      meta.totalChunks,
      mimeType || 'audio/wav',
    );
    const audioUrl = hasR2Credentials(c.env) ? await getAudioUrl(c.env, key, 604_800) : null;

    const recording = await insertRecording(c.env, {
      userId,
      title: title || defaultTitle(),
      audioKey: key,
      audioUrl,
      audioSize: size,
      audioMimeType: mimeType || 'audio/wav',
      duration: duration || 0,
      transcript: '',
      status: 'pending',
    });

    return c.json({ recording: serializeRecording(recording) }, 201);
  } catch (error) {
    console.error('[finalize-upload] Error:', error);
    return c.json({ error: 'Failed to finalize upload' }, 500);
  }
});

// ─── Limits ─────────────────────────────────────────────────────────────────

recordings.get('/limits', async (c) => {
  try {
    const userId = c.get('user').id;
    const userRow = await getUserById(c.env, userId);
    const planUser = userRow ? userPlanView(userRow) : null;
    const limits = await getEffectiveLimits(
      c.env,
      planUser ?? { plan: 'free', planExpiresAt: null, featureOverrides: null },
    );
    const plan = getActivePlan(planUser);

    const [monthlyCount, storageUsed] = await Promise.all([
      countRecordingsThisMonth(c.env, userId),
      sumStorageUsed(c.env, userId),
    ]);

    return c.json({
      plan,
      usage: {
        recordingsThisMonth: monthlyCount,
        storageUsedBytes: storageUsed,
      },
      limits: {
        recordingsPerMonth: limits.recordingsPerMonth,
        maxDurationSecs: limits.maxDurationSecs,
        maxStorageBytes: limits.maxStorageBytes,
        indianLanguages: limits.indianLanguages,
        meetingMinutes: limits.meetingMinutes,
        actionItems: limits.actionItems,
        pdfExport: limits.pdfExport,
      },
    });
  } catch (error) {
    console.error('Error fetching limits:', error);
    return c.json({ error: 'Failed to fetch usage limits' }, 500);
  }
});

// ─── List / detail ──────────────────────────────────────────────────────────

recordings.get('/', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      'SELECT * FROM recordings WHERE user_id = ? ORDER BY created_at DESC',
    )
      .bind(c.get('user').id)
      .all<RecordingRow>();

    const list = await Promise.all(
      (rows.results ?? []).map(async (row) => {
        const item = serializeRecordingLean(row);
        if (row.audio_key && hasR2Credentials(c.env)) {
          try {
            item.audioUrl = await getAudioUrl(c.env, row.audio_key);
          } catch {
            item.audioUrl = null;
          }
        }
        return item;
      }),
    );

    return c.json({ recordings: list });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return c.json({ error: 'Failed to fetch recordings' }, 500);
  }
});

recordings.get('/:id', async (c) => {
  try {
    const row = await getRecordingForUser(c.env, c.req.param('id'), c.get('user').id);
    if (!row) return c.json({ error: 'Recording not found' }, 404);

    const recording = serializeRecording(row);
    if (row.audio_key && hasR2Credentials(c.env)) {
      try {
        recording.audioUrl = await getAudioUrl(c.env, row.audio_key);
      } catch {
        // Keep existing URL if refresh fails
      }
    }
    return c.json({ recording });
  } catch (error) {
    console.error('Error fetching recording:', error);
    return c.json({ error: 'Failed to fetch recording' }, 500);
  }
});

// ─── Presigned upload URL (web direct-to-R2 path) ───────────────────────────

recordings.post('/upload-url', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.uploadUrl);
    const { mimeType, duration } = body ?? {};
    const userId = c.get('user').id;
    const userRow = await getUserById(c.env, userId);
    const check = await checkCreateLimits(c.env, userId, userRow, duration || 0, 0);
    if (!check.ok) return c.json({ error: check.error, code: check.code }, check.status ?? 403);

    const { uploadUrl, key } = await getUploadUrl(c.env, userId, mimeType);
    return c.json({ uploadUrl, key, plan: getActivePlan(userRow ? userPlanView(userRow) : null) });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return c.json({ error: 'Failed to generate upload URL' }, 500);
  }
});

// ─── Create recording ───────────────────────────────────────────────────────

recordings.post('/', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.createRecording);
    if (!body) return c.json({ error: 'Failed to create recording' }, 500);
    const { title, audioData, audioKey, audioSize: clientAudioSize, duration, transcript, mimeType, autoTranscribe, tempUpload } = body;
    const userId = c.get('user').id;
    const userRow = await getUserById(c.env, userId);

    // Plan limit checks. For presigned uploads the client reports size;
    // tempUpload audio isn't stored so it doesn't count toward storage quota.
    const incomingBytes =
      audioData && !tempUpload
        ? Math.floor((audioData.length * 3) / 4)
        : audioKey
          ? clientAudioSize || 0
          : 0;
    const check = await checkCreateLimits(c.env, userId, userRow, duration || 0, incomingBytes);
    if (!check.ok) return c.json({ error: check.error, code: check.code }, check.status ?? 403);

    let audioInfo: { audioKey: string | null; audioUrl: string | null; audioSize: number } = {
      audioKey: null,
      audioUrl: null,
      audioSize: 0,
    };
    let audioBytes: Uint8Array | null = null;
    let stagedTempKey: string | null = null;

    if (audioKey) {
      // Option 1: file already uploaded via presigned URL
      audioInfo.audioKey = audioKey;
      audioInfo.audioUrl = hasR2Credentials(c.env) ? await getAudioUrl(c.env, audioKey) : null;
      const head = await c.env.BUCKET.head(audioKey);
      audioInfo.audioSize = head?.size ?? clientAudioSize ?? 0;
    } else if (audioData) {
      // Option 2: base64 audioData in the request body
      const base64Data = audioData.replace(/^data:[^,]+,/, '');
      audioBytes = Uint8Array.from(atob(base64Data), (ch) => ch.charCodeAt(0));

      if (!tempUpload) {
        const uploaded = await uploadAudio(c.env, audioBytes, userId, mimeType || 'audio/webm');
        audioInfo = { audioKey: uploaded.key, audioUrl: uploaded.url, audioSize: uploaded.size };
      } else if (body.async) {
        // tempUpload + async: stage bytes so the workflow can read them
        // (lifecycle rule purges `uploads/` after a day)
        stagedTempKey = `uploads/tmp/${userId}/${newId()}`;
        await c.env.BUCKET.put(stagedTempKey, audioBytes);
      }
    }

    const wantsTranscription = autoTranscribe !== false && (!!audioBytes || !!audioInfo.audioKey);

    // ── Async path (new web client): start workflow and return immediately ──
    if (body.async && wantsTranscription) {
      const recording = await insertRecording(c.env, {
        userId,
        title: title || defaultTitle(),
        ...audioInfo,
        audioKey: audioInfo.audioKey ?? stagedTempKey,
        audioMimeType: mimeType || 'audio/webm',
        duration: duration || 0,
        transcript: transcript || '',
        status: 'transcribing',
      });
      await c.env.TRANSCRIBE_WF.create({ params: { task: 'transcribe', recordingId: recording.id, userId } });
      return c.json({ recording: serializeRecording(recording) }, 201);
    }

    // ── Legacy sync path (published mobile app waits in-request) ──
    let finalTranscript = transcript || '';
    let transcriptionDuration = duration || 0;
    let recordingStatus: RecordingRow['status'] = 'pending';

    if (wantsTranscription) {
      try {
        const source = audioBytes
          ? { bytes: audioBytes, size: audioBytes.length }
          : await r2AudioSource(c.env, audioInfo.audioKey as string);
        if (source) {
          if (source.size < 1000) throw new Error('Audio file is too small or corrupted');
          const result = await transcribeAudio(c.env, source, mimeType || 'audio/webm', userRow);
          finalTranscript = result.text;
          transcriptionDuration = result.duration || duration || 0;
          recordingStatus = 'transcribed';
        }
      } catch (transcribeError) {
        console.error('Auto-transcription failed:', transcribeError);
        // Continue without transcript (parity with old backend)
      }
    }

    // AI title when none was provided and we got a transcript
    let finalTitle = title;
    if (!title && finalTranscript && finalTranscript.length > 20 && c.env.GEMINI_API_KEY) {
      try {
        finalTitle = await generateTitle(c.env, finalTranscript);
      } catch {
        finalTitle = defaultTitle();
      }
    } else if (!title) {
      finalTitle = defaultTitle();
    }

    const recording = await insertRecording(c.env, {
      userId,
      title: finalTitle as string,
      ...audioInfo,
      audioMimeType: mimeType || 'audio/webm',
      duration: transcriptionDuration,
      transcript: finalTranscript,
      status: recordingStatus,
    });

    return c.json({ recording: serializeRecording(recording) }, 201);
  } catch (error) {
    console.error('Error creating recording:', error);
    return c.json({ error: 'Failed to create recording' }, 500);
  }
});

// ─── Update / delete ────────────────────────────────────────────────────────

recordings.patch('/:id', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.recordingPatch);
    if (!body) return c.json({ error: 'Failed to update recording' }, 500);
    const { title, transcript, summary, minutes, status, tags, actionItems } = body;

    const existing = await getRecordingForUser(c.env, c.req.param('id'), c.get('user').id);
    if (!existing) return c.json({ error: 'Recording not found' }, 404);

    await updateRow(c.env, 'recordings', existing.id, {
      title,
      transcript,
      summary,
      minutes,
      status,
      tags: tags !== undefined ? JSON.stringify(tags) : undefined,
      action_items: actionItems !== undefined ? JSON.stringify(actionItems) : undefined,
    });

    const row = await getRecordingForUser(c.env, existing.id, c.get('user').id);
    return c.json({ recording: serializeRecording(row as RecordingRow) });
  } catch (error) {
    console.error('Error updating recording:', error);
    return c.json({ error: 'Failed to update recording' }, 500);
  }
});

recordings.delete('/:id', async (c) => {
  try {
    const row = await getRecordingForUser(c.env, c.req.param('id'), c.get('user').id);
    if (!row) return c.json({ error: 'Recording not found' }, 404);

    if (row.audio_key) {
      try {
        await deleteAudio(c.env, row.audio_key);
      } catch (e) {
        console.error('Failed to delete audio from R2:', e);
      }
    }
    await c.env.DB.prepare('DELETE FROM recordings WHERE id = ?').bind(row.id).run();

    return c.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    return c.json({ error: 'Failed to delete recording' }, 500);
  }
});

// ─── AI operations ──────────────────────────────────────────────────────────

recordings.post('/:id/transcribe', async (c) => {
  try {
    const userId = c.get('user').id;
    const row = await getRecordingForUser(c.env, c.req.param('id'), userId);
    if (!row) return c.json({ error: 'Recording not found' }, 404);

    if (!row.audio_key && !row.audio_url) {
      return c.json({ error: 'No audio file found for this recording' }, 400);
    }

    await updateRow(c.env, 'recordings', row.id, { status: 'transcribing' });

    // Async mode (new web client): hand off to the workflow, client polls GET /:id
    const body = (await parseBody(c.req, schemas.asyncFlag)) ?? { async: false };
    if (body.async) {
      await c.env.TRANSCRIBE_WF.create({ params: { task: 'transcribe', recordingId: row.id, userId } });
      const pending = await getRecordingForUser(c.env, row.id, userId);
      return c.json({ recording: serializeRecording(pending as RecordingRow) }, 202);
    }

    try {
      const userRow = await getUserById(c.env, userId);
      const source = await r2AudioSource(c.env, row.audio_key as string);
      if (!source) throw new Error('Audio object not found in storage');

      const result = await transcribeAudio(c.env, source, row.audio_mime_type, userRow);

      await updateRow(c.env, 'recordings', row.id, {
        transcript: result.text,
        duration: Math.round(result.duration || row.duration),
        status: 'transcribed',
      });
      const updated = await getRecordingForUser(c.env, row.id, userId);

      return c.json({
        transcript: result.text,
        duration: result.duration,
        recording: serializeRecording(updated as RecordingRow),
      });
    } catch (transcribeError) {
      await updateRow(c.env, 'recordings', row.id, { status: 'failed' });
      await logError(c.env, 'transcription_failed', (transcribeError as Error).message, {
        userId,
        recordingId: row.id,
      });
      throw transcribeError;
    }
  } catch (error) {
    console.error('Error transcribing recording:', error);
    return c.json({ error: 'Failed to transcribe recording: ' + (error as Error).message }, 500);
  }
});

recordings.post('/:id/summarize', async (c) => {
  try {
    const userId = c.get('user').id;
    const row = await getRecordingForUser(c.env, c.req.param('id'), userId);
    if (!row) return c.json({ error: 'Recording not found' }, 404);

    const body = (await parseBody(c.req, schemas.summarize)) ?? {};
    const transcript = row.transcript || body.transcript || '';
    if (!transcript || transcript.length < 50) {
      return c.json({ error: 'Transcript too short to summarize' }, 400);
    }

    const userRow = await getUserById(c.env, userId);
    const englishTranscript = await toEnglishTranscript(c.env, transcript, userRow);
    let summary = await generateSummary(c.env, englishTranscript);
    summary = await toPreferredLanguage(c.env, summary, userRow);

    await updateRow(c.env, 'recordings', row.id, { summary, status: 'summarized' });
    const updated = await getRecordingForUser(c.env, row.id, userId);

    return c.json({ summary, recording: serializeRecording(updated as RecordingRow) });
  } catch (error) {
    console.error('Error generating summary:', error);
    await logError(c.env, 'summary_failed', (error as Error).message, { userId: c.get('user').id });
    return c.json({ error: 'Failed to generate summary: ' + (error as Error).message }, 500);
  }
});

recordings.post('/:id/minutes', async (c) => {
  try {
    const userId = c.get('user').id;
    const userRow = await getUserById(c.env, userId);
    const limits = await getEffectiveLimits(
      c.env,
      userRow ? userPlanView(userRow) : { plan: 'free', planExpiresAt: null, featureOverrides: null },
    );
    if (!limits.meetingMinutes) {
      return c.json(
        {
          error: 'Meeting minutes require a Pro or Team plan. Upgrade to unlock this feature.',
          code: 'PLAN_LIMIT_MINUTES',
        },
        403,
      );
    }

    const row = await getRecordingForUser(c.env, c.req.param('id'), userId);
    if (!row) return c.json({ error: 'Recording not found' }, 404);
    if (!row.transcript || row.transcript.length < 50) {
      return c.json({ error: 'Transcript too short to generate minutes' }, 400);
    }

    // Output language handled natively by Gemini (parity with old backend)
    const LANG_LABELS: Record<string, string> = {
      hindi: 'Hindi', tamil: 'Tamil', telugu: 'Telugu', bengali: 'Bengali',
      kannada: 'Kannada', malayalam: 'Malayalam', marathi: 'Marathi',
      gujarati: 'Gujarati', punjabi: 'Punjabi', odia: 'Odia',
    };
    const prefLang = userRow?.summary_language?.toLowerCase().trim();
    const outputLanguage =
      prefLang && prefLang !== 'english' && prefLang !== 'en' ? (LANG_LABELS[prefLang] ?? null) : null;

    const minutes = await generateMeetingMinutes(c.env, row.transcript, row.summary, row.title, outputLanguage);

    await updateRow(c.env, 'recordings', row.id, { minutes, status: 'completed' });
    const updated = await getRecordingForUser(c.env, row.id, userId);

    return c.json({ minutes, recording: serializeRecording(updated as RecordingRow) });
  } catch (error) {
    console.error('Error generating minutes:', error);
    await logError(c.env, 'minutes_failed', (error as Error).message, { userId: c.get('user').id });
    return c.json({ error: 'Failed to generate minutes: ' + (error as Error).message }, 500);
  }
});

recordings.post('/:id/actions', async (c) => {
  try {
    const userId = c.get('user').id;
    const userRow = await getUserById(c.env, userId);
    const limits = await getEffectiveLimits(
      c.env,
      userRow ? userPlanView(userRow) : { plan: 'free', planExpiresAt: null, featureOverrides: null },
    );
    if (!limits.actionItems) {
      return c.json(
        {
          error: 'Action item extraction requires a Pro or Team plan. Upgrade to unlock this feature.',
          code: 'PLAN_LIMIT_ACTIONS',
        },
        403,
      );
    }

    const row = await getRecordingForUser(c.env, c.req.param('id'), userId);
    if (!row) return c.json({ error: 'Recording not found' }, 404);
    if (!row.transcript || row.transcript.length < 50) {
      return c.json({ error: 'Transcript too short to extract actions' }, 400);
    }

    const actionItems = await extractActionItems(c.env, row.transcript);
    // Subdocument _id parity with Mongoose
    const withIds = actionItems.map((item) => ({ _id: newId(), completed: false, ...item }));

    await updateRow(c.env, 'recordings', row.id, { action_items: JSON.stringify(withIds) });
    const updated = await getRecordingForUser(c.env, row.id, userId);

    return c.json({ actionItems: withIds, recording: serializeRecording(updated as RecordingRow) });
  } catch (error) {
    console.error('Error extracting action items:', error);
    await logError(c.env, 'actions_failed', (error as Error).message, { userId: c.get('user').id });
    return c.json({ error: 'Failed to extract action items: ' + (error as Error).message }, 500);
  }
});

recordings.post('/:id/generate-title', async (c) => {
  try {
    const userId = c.get('user').id;
    const row = await getRecordingForUser(c.env, c.req.param('id'), userId);
    if (!row) return c.json({ error: 'Recording not found' }, 404);
    if (!row.transcript || row.transcript.length < 20) {
      return c.json({ error: 'Transcript too short to generate title' }, 400);
    }

    const title = await generateTitle(c.env, row.transcript);
    await updateRow(c.env, 'recordings', row.id, { title });
    const updated = await getRecordingForUser(c.env, row.id, userId);

    return c.json({ title, recording: serializeRecording(updated as RecordingRow) });
  } catch (error) {
    console.error('Error generating title:', error);
    return c.json({ error: 'Failed to generate title: ' + (error as Error).message }, 500);
  }
});

export default recordings;
