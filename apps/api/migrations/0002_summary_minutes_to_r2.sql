-- Move recording summary & meeting-minutes text out of D1 into R2
-- (derived/<userId>/<recordingId>/{summary,minutes}.md). They're large,
-- write-once blobs that bloated every row and the cost of listing.
--
-- D1 keeps only their character counts so the admin cost dashboard can still
-- estimate Gemini output tokens without the text (byte size from R2 is wrong
-- for multibyte Indian-language output).

ALTER TABLE recordings DROP COLUMN summary;
ALTER TABLE recordings DROP COLUMN minutes;
ALTER TABLE recordings ADD COLUMN summary_chars INTEGER NOT NULL DEFAULT 0;
ALTER TABLE recordings ADD COLUMN minutes_chars INTEGER NOT NULL DEFAULT 0;
