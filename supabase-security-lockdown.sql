-- ============================================================
-- Security lockdown: stop users from granting themselves privileges
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Why: the profiles UPDATE policy lets a signed in user edit their own
-- row with no column limits, so someone calling the Supabase API directly
-- could set is_admin or is_cmo to TRUE on themselves. This trigger
-- reverts any change to those two columns made by a signed in user.
-- Changes made from the SQL editor or the server (service role) are not
-- affected, because they have no auth.uid().
-- Normal site behavior is unchanged: the app never edits these columns.
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.is_admin := OLD.is_admin;
    NEW.is_cmo   := OLD.is_cmo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_privileged_profile_columns ON public.profiles;
CREATE TRIGGER trg_guard_privileged_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_privileged_profile_columns();

-- New profiles can never start as admin or CMO when created by a signed in user.
CREATE OR REPLACE FUNCTION public.guard_privileged_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.is_admin := FALSE;
    NEW.is_cmo   := FALSE;
    NEW.is_referrer := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_privileged_profile_insert ON public.profiles;
CREATE TRIGGER trg_guard_privileged_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_privileged_profile_insert();

-- Check: expect 2 rows.
SELECT tgname FROM pg_trigger
 WHERE tgname IN ('trg_guard_privileged_profile_columns', 'trg_guard_privileged_profile_insert')
   AND NOT tgisinternal;
