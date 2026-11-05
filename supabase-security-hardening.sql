-- ============================================================
-- Security hardening (safe, no change to normal site behavior)
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- 1. Members could set is_referrer = TRUE on their own profile through the
--    API. The app never edits that column from the browser (it is set from
--    the SQL editor), so lock it the same way is_admin / is_cmo are locked.
-- 2. prune_rate_limit_log() was callable by anyone, even signed-out
--    visitors. Only the database owner should run it.
-- 3. is_subscribed(uid) was callable by signed-out visitors, letting anyone
--    check whether a given member is subscribed. Signed-in members still
--    use it inside the security rules, so they keep access.
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.is_admin    := OLD.is_admin;
    NEW.is_cmo      := OLD.is_cmo;
    NEW.is_referrer := OLD.is_referrer;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_rate_limit_log() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_subscribed(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_subscribed(UUID) TO authenticated;

-- Check: expect 1 row (the trigger) and anon_can_run = false for both.
SELECT
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_guard_privileged_profile_columns' AND NOT tgisinternal) AS guard_trigger,
  has_function_privilege('anon', 'public.prune_rate_limit_log()', 'EXECUTE') AS prune_anon_can_run,
  has_function_privilege('anon', 'public.is_subscribed(uuid)', 'EXECUTE')    AS is_subscribed_anon_can_run;
