-- Top Friends launch announcement stamp (the dashboard shows the modal once
-- per subscriber). Safe to re-run.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS top_friends_announced_at TIMESTAMPTZ;

-- Check: expect 1.
SELECT count(*) AS top_friends_announced_col
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'profiles'
   AND column_name = 'top_friends_announced_at';
