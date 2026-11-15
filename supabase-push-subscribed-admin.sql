-- ============================================================
-- Phone push to the admin (@yasom only) when a member subscribes
-- ============================================================
-- Run once in the Supabase SQL editor (after supabase-push-notifications.sql).
-- Safe to re-run. No code push needed.
--
-- @yasom gets one phone push when:
--   - a new member starts a free trial        -> "started a free trial"
--   - a member who was not subscribed (new, canceled, past due, etc.)
--     becomes active                           -> "just subscribed"
--   - a trial turns into a paid membership     -> "trial turned into a paid membership"
-- Tapping it opens that member's profile. Comped accounts do not trigger it,
-- repeat PayPal updates for the same state do not trigger it, and no other
-- user ever receives it. A failed push never blocks the subscription update.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_push_admin_subscribed() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin UUID;
  v_name  TEXT;
  v_old   TEXT;
  v_msg   TEXT;
BEGIN
  IF COALESCE((to_jsonb(NEW)->>'is_comped')::boolean, FALSE) THEN RETURN NULL; END IF;
  IF NEW.status NOT IN ('active', 'trialing') THEN RETURN NULL; END IF;

  v_old := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
  IF v_old = NEW.status THEN RETURN NULL; END IF;

  IF NEW.status = 'trialing' THEN
    IF v_old = 'active' THEN RETURN NULL; END IF;
    v_msg := 'started a free trial';
  ELSIF v_old = 'trialing' THEN
    v_msg := 'trial turned into a paid membership';
  ELSE
    v_msg := 'just subscribed';
  END IF;

  SELECT user_id INTO v_admin
    FROM public.profiles
   WHERE lower(username) = 'yasom' AND is_admin = TRUE
   LIMIT 1;
  IF v_admin IS NULL OR v_admin = NEW.user_id THEN RETURN NULL; END IF;

  SELECT username INTO v_name FROM public.profiles WHERE user_id = NEW.user_id;

  PERFORM public.send_push(
    v_admin,
    'Subscription update',
    COALESCE('@' || v_name, 'A member') || ' ' || v_msg,
    COALESCE('/profile/' || v_name, '/admin'),
    'sub-' || NEW.user_id::text
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS push_admin_subscribed ON public.subscriptions;
CREATE TRIGGER push_admin_subscribed
  AFTER INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_push_admin_subscribed();

-- ---------- Check ------------------------------------------------------------
-- Expect: trigger = 1.
SELECT count(*) AS trigger FROM pg_trigger
 WHERE tgname = 'push_admin_subscribed' AND NOT tgisinternal;
