-- Move transcript text to R2 too (transcript/<userId>/<recordingId>.md), and
-- drop audio_url: it was a stale presigned URL, always re-signed from audio_key
-- on read (recordings.ts), so it was never used. D1 keeps transcript_chars for
-- the admin Gemini-input cost metric. audio_key stays — it's the audio pointer.

ALTER TABLE recordings DROP COLUMN transcript;
ALTER TABLE recordings DROP COLUMN audio_url;
ALTER TABLE recordings ADD COLUMN transcript_chars INTEGER NOT NULL DEFAULT 0;
