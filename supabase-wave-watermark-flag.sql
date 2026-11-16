-- Wave videos: remember whether the Mitype watermark is baked into the file.
-- true  = edited video (watermark is part of the picture)  [all existing videos]
-- false = original file uploaded untouched (the feed draws the watermark)
-- Safe to re-run. Run this BEFORE pushing the code.
ALTER TABLE public.wave_videos
  ADD COLUMN IF NOT EXISTS watermark_baked BOOLEAN NOT NULL DEFAULT TRUE;

SELECT count(*) AS has_column
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'wave_videos' AND column_name = 'watermark_baked';
