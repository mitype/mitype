-- Security hardening pass.
--
-- This migration adds:
--   1. A `rate_limit_log` table + check_rate_limit() RPC so the app
--      can enforce per-user-per-window limits on any action (posting
--      currents, sending DMs, echoing, voting, etc).
--   2. Storage bucket size and MIME-type whitelists so a malicious
--      user can't upload a 5 GB binary blob to burn storage.
--   3. A daily cleanup function to prune stale rate-limit rows.
--
-- The rate limiter is the single biggest defense against bot abuse
-- once we get real users — it caps "how fast can a single account
-- spam" at the database level so even a client that bypasses the
-- JavaScript check still gets blocked.

-- ---------- rate_limit_log table ----------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index tuned for "how many <action> rows does <user> have in the last
-- <window> seconds" lookups, which is the only query we run on it.
CREATE INDEX IF NOT EXISTS rate_limit_log_lookup_idx
  ON public.rate_limit_log (user_id, action, created_at DESC);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only the rate-limit RPC (SECURITY DEFINER) touches this table.
-- Direct SELECT/INSERT/DELETE from end users is denied.
DROP POLICY IF EXISTS rate_limit_log_no_direct ON public.rate_limit_log;
CREATE POLICY rate_limit_log_no_direct ON public.rate_limit_log
  FOR ALL TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

-- ---------- check_rate_limit RPC ----------------------------------------
-- Returns TRUE if the action is allowed (and records it). Returns FALSE
-- if the user has already hit the cap. SECURITY DEFINER so it can write
-- to rate_limit_log even though direct writes are denied.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_key      TEXT,
  max_count       INTEGER,
  window_seconds  INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  uid           UUID := auth.uid();
BEGIN
  -- If somehow called without a session, deny.
  IF uid IS NULL THEN
    RETURN FALSE;
  END IF;
  -- Sanity: cap window to one day so a typo can't lock someone out forever.
  IF window_seconds > 86400 THEN
    window_seconds := 86400;
  END IF;
  SELECT COUNT(*)::INTEGER INTO current_count
  FROM public.rate_limit_log
  WHERE user_id = uid
    AND action = action_key
    AND created_at > NOW() - (window_seconds || ' seconds')::INTERVAL;
  IF current_count >= max_count THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.rate_limit_log (user_id, action) VALUES (uid, action_key);
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;

-- ---------- daily cleanup function --------------------------------------
-- Removes rate-limit log rows older than 24 hours. Schedule from the
-- Supabase Cron dashboard with: `SELECT public.prune_rate_limit_log();`
-- (daily at 03:00 UTC is fine).
CREATE OR REPLACE FUNCTION public.prune_rate_limit_log() RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_log WHERE created_at < NOW() - INTERVAL '24 hours';
$$;

GRANT EXECUTE ON FUNCTION public.prune_rate_limit_log() TO authenticated;

-- ---------- Storage bucket file size + MIME limits ----------------------
-- Tightens every user-facing storage bucket so somebody can't upload a
-- 5 GB binary to burn through your 100 GB quota. Values are generous
-- enough that legitimate use is never blocked but tight enough that
-- abuse hits the wall fast.
--
-- File size limits are in BYTES.
UPDATE storage.buckets
  SET file_size_limit = 15728640, -- 15 MB (comfortably above phone-camera photos)
      allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic']
  WHERE id = 'profile-photos';

UPDATE storage.buckets
  SET file_size_limit = 15728640,
      allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic']
  WHERE id = 'home-goods-photos';

UPDATE storage.buckets
  SET file_size_limit = 15728640,
      allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic']
  WHERE id = 'business-photos';

UPDATE storage.buckets
  SET file_size_limit = 15728640,
      allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic']
  WHERE id = 'pet-photos';

UPDATE storage.buckets
  SET file_size_limit = 26214400, -- 25 MB (voice notes are bigger)
      allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav']
  WHERE id = 'message-media';

UPDATE storage.buckets
  SET file_size_limit = 209715200, -- 200 MB (Wave videos can be large)
      allowed_mime_types = ARRAY['video/mp4','video/webm','video/quicktime']
  WHERE id = 'wave-videos';
