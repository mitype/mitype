-- ============================================================
-- Founders 50 referral program
-- ============================================================
-- Run this once in the Supabase SQL editor. Safe to re-run. It replaces
-- any earlier version of this file.
--
-- What it does:
--   1. Adds two profile columns: founders_50_joined_at (when a member
--      first took a seat) and founders_50_removed_at (set when a lapsed
--      subscription removed them).
--   2. Opt in rules (database trigger):
--        - only active or trialing subscribers can opt in
--        - once 50 members have joined, no new member can opt in. A
--          seat is never released, even if that member opts out or is
--          removed, and a member who already has a seat can always come
--          back. Nothing about the limit is ever shown to users.
--        - opting in makes them a referrer (referral link + Mi Referrals)
--        - a signed in user cannot grant or remove referrer status or
--          edit the two columns above directly
--   3. Sends the "Your share link is now a referral link" notification
--      on opt in (once per person).
--   4. Automatic removal: when a subscription is no longer active or
--      trialing (canceled, past due, suspended, deleted), the member is
--      removed from the Founders 50 and loses the referral link. The
--      subscription page then shows "Removed for subscription lapsed
--      payment". If they subscribe again they can opt back in.
--   5. Existing members: everyone already opted in gets a seat and the
--      referral link, and anyone opted in without a current
--      subscription is marked removed.
--   6. founders_50_can_join(): tells the page whether to show the opt in
--      button. It returns only true or false, never a count.
--   7. Deletes the old Founders 50 announcement notifications and the
--      old spots counter function.
-- ============================================================

-- ---------- 1. columns ----------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founders_50_joined_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS founders_50_removed_at TIMESTAMPTZ;

-- Everyone already opted in holds a seat.
UPDATE public.profiles
   SET founders_50_joined_at = COALESCE(founders_50_joined_at, NOW())
 WHERE founders_50_opted_in = TRUE
   AND founders_50_joined_at IS NULL;

-- ---------- 2. opt in rules ------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_founders_50_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_internal BOOLEAN := COALESCE(current_setting('mitype.founders_internal', true), '') = '1';
BEGIN
  -- Signed in users cannot edit the membership bookkeeping directly.
  IF NOT is_internal AND auth.uid() IS NOT NULL THEN
    NEW.founders_50_joined_at  := OLD.founders_50_joined_at;
    NEW.founders_50_removed_at := OLD.founders_50_removed_at;
  END IF;

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

    -- Seats: members who already hold one can always return. Anyone
    -- new is turned away once 50 seats have been taken. The lock keeps
    -- two people from taking the last seat at the same moment.
    IF OLD.founders_50_joined_at IS NULL THEN
      PERFORM pg_advisory_xact_lock(50505050);
      IF (SELECT count(*) FROM public.profiles
           WHERE founders_50_joined_at IS NOT NULL
             AND user_id <> NEW.user_id) >= 50 THEN
        RAISE EXCEPTION 'Opt in is not available right now.'
          USING ERRCODE = 'check_violation';
      END IF;
      NEW.founders_50_joined_at := NOW();
    ELSE
      NEW.founders_50_joined_at := OLD.founders_50_joined_at;
    END IF;

    NEW.founders_50_removed_at := NULL;
    NEW.is_referrer := TRUE;

  ELSIF NOT is_internal
        AND auth.uid() IS NOT NULL
        AND NEW.is_referrer IS DISTINCT FROM OLD.is_referrer THEN
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

-- ---------- 3. welcome notification on opt in ------------------------------
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

-- ---------- 4. automatic removal when a subscription lapses -----------------
CREATE OR REPLACE FUNCTION public.founders_50_remove_on_lapse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  still_active BOOLEAN;
BEGIN
  uid := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
     WHERE s.user_id = uid
       AND s.status IN ('active', 'trialing')
  ) INTO still_active;

  IF NOT still_active THEN
    PERFORM set_config('mitype.founders_internal', '1', true);
    UPDATE public.profiles
       SET founders_50_opted_in   = FALSE,
           is_referrer            = FALSE,
           founders_50_removed_at = NOW()
     WHERE user_id = uid
       AND founders_50_opted_in = TRUE;
    PERFORM set_config('mitype.founders_internal', '', true);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_founders_50_remove_on_lapse ON public.subscriptions;
CREATE TRIGGER trg_founders_50_remove_on_lapse
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.founders_50_remove_on_lapse();

-- ---------- 5. existing members ---------------------------------------------
-- Current subscribers who are opted in become referrers.
UPDATE public.profiles p
   SET is_referrer = TRUE
 WHERE p.founders_50_opted_in = TRUE
   AND p.is_referrer IS DISTINCT FROM TRUE
   AND EXISTS (SELECT 1 FROM public.subscriptions s
                WHERE s.user_id = p.user_id AND s.status IN ('active', 'trialing'));

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

-- Opted in but no current subscription: mark as removed.
UPDATE public.profiles p
   SET founders_50_opted_in   = FALSE,
       is_referrer            = FALSE,
       founders_50_removed_at = NOW()
 WHERE p.founders_50_opted_in = TRUE
   AND NOT EXISTS (SELECT 1 FROM public.subscriptions s
                    WHERE s.user_id = p.user_id AND s.status IN ('active', 'trialing'));

-- ---------- 6. can this person see the opt in button? -----------------------
CREATE OR REPLACE FUNCTION public.founders_50_can_join()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles
             WHERE user_id = auth.uid() AND founders_50_joined_at IS NOT NULL)
    OR (SELECT count(*) FROM public.profiles WHERE founders_50_joined_at IS NOT NULL) < 50;
$$;

GRANT EXECUTE ON FUNCTION public.founders_50_can_join() TO authenticated;

-- ---------- 7. cleanup ------------------------------------------------------
DROP FUNCTION IF EXISTS public.founders_50_spots_taken();
DELETE FROM public.notifications WHERE type = 'founders_50_announce';

-- ---------- Check -----------------------------------------------------------
-- Expect: opted_in_not_referrer = 0, old_announcements = 0, triggers = 3.
-- seats_taken is for you only. Users never see it.
SELECT
  (SELECT count(*) FROM public.profiles WHERE founders_50_joined_at IS NOT NULL) AS seats_taken,
  (SELECT count(*) FROM public.profiles WHERE founders_50_opted_in = TRUE) AS opted_in_now,
  (SELECT count(*) FROM public.profiles
    WHERE founders_50_opted_in = TRUE AND is_referrer IS DISTINCT FROM TRUE) AS opted_in_not_referrer,
  (SELECT count(*) FROM public.profiles WHERE founders_50_removed_at IS NOT NULL) AS removed_for_lapse,
  (SELECT count(*) FROM public.notifications WHERE type = 'founders_50_announce') AS old_announcements,
  (SELECT count(*) FROM pg_trigger
    WHERE tgname IN ('trg_enforce_founders_50_subscription', 'trg_founders_50_welcome', 'trg_founders_50_remove_on_lapse')
      AND NOT tgisinternal) AS triggers;
