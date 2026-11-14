-- ============================================================
-- Feature announcements are for subscribers only
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- 1. Removes launch/announcement notifications from every account that
--    does not have an active or trialing subscription.
-- 2. Adds a guard so any future announcement notification is silently
--    skipped for people who are not subscribed (so a blast SQL can never
--    reach them again).
--
-- Announcement types covered: any notification type ending in
-- "announce" or "announcement" (Brand Deals, Collab Suite, Founders 50,
-- Black Sheep University, Amazon and Cottage Bakery masterclasses, phone
-- notifications, and future ones). Normal notifications (messages,
-- connections, likes) are not touched.
-- ============================================================

CREATE OR REPLACE FUNCTION public.announce_is_subscriber(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
     WHERE s.user_id = p_user AND s.status IN ('active', 'trialing')
  )
$$;
REVOKE ALL ON FUNCTION public.announce_is_subscriber(UUID) FROM PUBLIC, anon, authenticated;

-- 1. Clean up what non-subscribers already have.
DELETE FROM public.notifications n
 WHERE n.type ~ '(announce|announcement)$'
   AND NOT public.announce_is_subscriber(n.user_id);

-- 2. Guard future inserts.
CREATE OR REPLACE FUNCTION public.notifications_announce_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type ~ '(announce|announcement)$'
     AND NOT public.announce_is_subscriber(NEW.user_id) THEN
    RETURN NULL;  -- skip this row, no error
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notifications_announce_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notifications_announce_guard ON public.notifications;
CREATE TRIGGER trg_notifications_announce_guard
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_announce_guard();

-- Check: expect leftover_for_non_subscribers = 0 and guard = 1.
SELECT
  (SELECT count(*) FROM public.notifications n
    WHERE n.type ~ '(announce|announcement)$'
      AND NOT public.announce_is_subscriber(n.user_id)) AS leftover_for_non_subscribers,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_notifications_announce_guard') AS guard;
