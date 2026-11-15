-- ============================================================
-- Phone push to the admin (@yasom only) when someone creates a profile
-- ============================================================
-- Run once in the Supabase SQL editor (after supabase-push-notifications.sql).
-- Safe to re-run. No code push needed.
--
-- Every time a new profile is created, @yasom gets one phone push:
--   "@newuser just joined (Subscribed)"  or  "(Not subscribed yet)"
-- Tapping it opens the new member's profile. No other user ever receives it,
-- and a failed push never blocks signup.
--
-- Note: a profile is created at signup, usually before the person has paid,
-- so most pushes will read "Not subscribed yet".
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_push_admin_new_member() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin  UUID;
  v_status TEXT;
  v_label  TEXT;
BEGIN
  SELECT user_id INTO v_admin
    FROM public.profiles
   WHERE lower(username) = 'yasom' AND is_admin = TRUE
   LIMIT 1;
  IF v_admin IS NULL OR v_admin = NEW.user_id THEN RETURN NULL; END IF;

  SELECT status INTO v_status FROM public.subscriptions WHERE user_id = NEW.user_id;
  v_label := CASE WHEN v_status IN ('active', 'trialing') THEN 'Subscribed' ELSE 'Not subscribed yet' END;

  PERFORM public.send_push(
    v_admin,
    'New member joined',
    COALESCE('@' || NEW.username, 'Someone') || ' just joined (' || v_label || ')',
    COALESCE('/profile/' || NEW.username, '/admin'),
    'new-member-' || NEW.user_id::text
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS push_admin_new_member ON public.profiles;
CREATE TRIGGER push_admin_new_member
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_push_admin_new_member();

-- ---------- Check ------------------------------------------------------------
-- Expect: trigger = 1, and the admin has a phone registered (devices >= 1).
SELECT
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'push_admin_new_member' AND NOT tgisinternal) AS trigger,
  (SELECT count(*) FROM public.push_subscriptions ps
     JOIN public.profiles p ON p.user_id = ps.user_id
    WHERE lower(p.username) = 'yasom') AS devices;
