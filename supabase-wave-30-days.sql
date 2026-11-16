-- Wave videos now live 30 days instead of 24 hours.
-- New videos only: videos already posted keep their original expiry.
-- (The app also sets expires_at explicitly when a video is saved.)
ALTER TABLE public.wave_videos
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '30 days');

-- Check: expect a default containing "30 days".
SELECT column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'wave_videos' AND column_name = 'expires_at';
