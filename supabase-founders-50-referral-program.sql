-- ============================================================
-- Founders 50 becomes the referral program (capped at 50)
-- ============================================================
-- What this does:
--   1. Adds founders_50_spots_taken(), used by the subscription page
--      to show how many of the 50 spots are left.
--   2. Replaces the opt in trigger so that:
--        - only active or trialing subscribers can opt in (as before)
--        - no one can opt in once 50 members have joined
--        - opting in automatically sets is_referrer = TRUE, which turns
--          the profile share link into a referral link and adds
--          Mi Referrals to the burger menu
--        - a signed in user can no longer set is_referrer on their own
--          profile directly (only the opt in path or the SQL editor can)
--   3. Sends the "Your share link is now a referral link" notification
--      when someone opts in (once per person).
--   4. Gives everyone who is already opted in the referral link and the
--      same notification.
--   5. Deletes the old Founders 50 announcement notifications.
--
-- Safe to re-run.
-- ============================================================

-- ---------- 1. spots counter -------------------------------------------
CREATE OR REPLACE FUNCTION public.founders_50_spots_taken()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.profiles WHERE founders_50_opted_in = TRUE;
$$;

GRANT EXECUTE ON FUNCTION public.founders_50_spots_taken() TO authenticated;

-- ---------- 2. opt in rules --------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_founders_50_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.founders_50_opted_in = TRUE
     AND (OLD.founders_50_opted_in IS DISTINCT FROM TRUE) THEN

    -- Must be an active or trialing subscriber.
    IF NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = NEW.user_id
        AND s.status IN ('active', 'trialing')
    ) THEN
      RAISE EXCEPTION 'Subscribe to opt in to the Founders 50.'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Hard cap of 50. The lock keeps two people from taking the last
    -- spot at the same moment.
    PERFORM pg_advisory_xact_lock(50505050);
    IF (SELECT count(*) FROM public.profiles
         WHERE founders_50_opted_in = TRUE
           AND user_id <> NEW.user_id) >= 50 THEN
      RAISE EXCEPTION 'All 50 Founders 50 spots are taken.'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Opting in makes them a referrer.
    NEW.is_referrer := TRUE;

  ELSIF NEW.is_referrer IS DISTINCT FROM OLD.is_referrer
        AND auth.uid() IS NOT NULL THEN
    -- A signed in user cannot grant or remove referrer status on their
    -- own profile. The SQL editor and server code (no signed in user)
    -- are still allowed.
    NEW.is_referrer := OLD.is_referrer;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_founders_50_subscription ON public.profiles;
CREATE TRIGGER trg_enforce_founders_50_subscription
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_founders_50_subscription();

GRANT EXECUTE ON FUNCTION public.enforce_founders_50_subscription() TO authenticated;

-- ---------- 3. welcome notification on opt in --------------------------
CREATE OR REPLACE FUNCTION public.founders_50_welcome_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.founders_50_opted_in = TRUE
     AND (OLD.founders_50_opted_in IS DISTINCT FROM TRUE)
     AND NEW.is_referrer = TRUE THEN
    INSERT INTO public.notifications (
      user_id, type, title, body, action_url, is_read, created_at
    )
    SELECT
      NEW.user_id,
      'referrer_welcome',
      'Your share link is now a referral link',
      'Your profile share link has been converted to a referral link. Everyone who joins through it will be listed on your Mi Referrals page, which you can find in the burger menu.',
      '/mi-referrals',
      FALSE,
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = NEW.user_id AND n.type = 'referrer_welcome'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_founders_50_welcome ON public.profiles;
CREATE TRIGGER trg_founders_50_welcome
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.founders_50_welcome_notification();

-- ---------- 4. everyone already opted in -------------------------------
UPDATE public.profiles
   SET is_referrer = TRUE
 WHERE founders_50_opted_in = TRUE
   AND is_referrer IS DISTINCT FROM TRUE;

INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'referrer_welcome',
  'Your share link is now a referral link',
  'Your profile share link has been converted to a referral link. Everyone who joins through it will be listed on your Mi Referrals page, which you can find in the burger menu.',
  '/mi-referrals',
  FALSE,
  NOW()
FROM public.profiles p
WHERE p.founders_50_opted_in = TRUE
  AND p.is_referrer = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = p.user_id AND n.type = 'referrer_welcome'
  );

-- ---------- 5. remove the old announcement ------------------------------
DELETE FROM public.notifications WHERE type = 'founders_50_announce';

-- ---------- Check ---------------------------------------------------------
-- Expect: spots_taken at most 50, everyone opted in is also a referrer,
-- no leftover announcement notifications, and both triggers present.
SELECT
  (SELECT count(*) FROM public.profiles WHERE founders_50_opted_in = TRUE) AS spots_taken,
  (SELECT count(*) FROM public.profiles
    WHERE founders_50_opted_in = TRUE AND is_referrer IS DISTINCT FROM TRUE) AS opted_in_not_referrer,
  (SELECT count(*) FROM public.notifications WHERE type = 'founders_50_announce') AS old_announcements,
  (SELECT count(*) FROM pg_trigger
    WHERE tgname IN ('trg_enforce_founders_50_subscription', 'trg_founders_50_welcome')
      AND NOT tgisinternal) AS triggers_present;
