-- ============================================================
-- Reserved usernames + official profile support
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- 1. Nobody signed in can create or change a username to the company
--    name (mitype, mitypeapp, or anything containing "mitype") or to
--    names that imitate staff (admin, support, official, and so on).
--    Changes made from the SQL editor or the server are not affected,
--    which is how the official @mitype profile is created.
--    Existing members keep their current usernames.
-- 2. Lets the official profile exist without a date of birth.
-- 3. Lists any existing profiles that already use a reserved name so
--    you can review them (nothing is renamed or deleted automatically).
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_reserved_username(raw TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    lower(regexp_replace(raw, '^@', '')) = ANY (ARRAY[
      'mitype','mitypeapp','admin','administrator','support','help',
      'official','staff','team','moderator','mod','security','system',
      'root','info','contact','billing','founder','ceo','cmo'
    ])
    OR regexp_replace(lower(raw), '[^a-z0-9]', '', 'g') LIKE '%mitype%';
$$;

CREATE OR REPLACE FUNCTION public.guard_reserved_username()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only signed in users are restricted. The SQL editor and the server
  -- (service role) have no auth.uid() and are allowed.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_reserved_username(NEW.username) THEN
    RETURN NEW;
  END IF;

  -- Existing members keep the username they already have (this also
  -- covers an upsert that re-sends the same username).
  IF TG_OP = 'UPDATE' AND NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.user_id = NEW.user_id
       AND lower(p.username) = lower(NEW.username)
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'That username is reserved. Please choose another.'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_reserved_username ON public.profiles;
CREATE TRIGGER trg_guard_reserved_username
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_reserved_username();

-- The official profile has no date of birth.
ALTER TABLE public.profiles ALTER COLUMN date_of_birth DROP NOT NULL;

-- ---------- Check -----------------------------------------------------
-- Expect: trigger_installed = 1. The list below should be empty; any
-- row is an existing profile using a reserved name, for you to review.
SELECT count(*) AS trigger_installed
  FROM pg_trigger
 WHERE tgname = 'trg_guard_reserved_username' AND NOT tgisinternal;

SELECT user_id, username, created_at
  FROM public.profiles
 WHERE public.is_reserved_username(username)
 ORDER BY created_at DESC;
