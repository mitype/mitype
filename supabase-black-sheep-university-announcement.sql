-- ============================================================
-- Black Sheep University launch announcement
-- ============================================================
-- Adds:
--   1. One column on profiles:
--        - black_sheep_university_announced_at   TIMESTAMPTZ
--          tracks the first time the one-time dashboard modal was
--          shown (or dismissed) for this user.
--   2. A one-time notification blast to every CURRENTLY subscribed
--      user telling them Black Sheep University and the YouTube
--      Masterclass are live. Non-subscribers are skipped since the
--      feature is a subscriber-only benefit.
--
-- Safe to re-run.
-- ============================================================

-- ---------- column -------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS black_sheep_university_announced_at TIMESTAMPTZ;

-- ---------- one-time notification blast -----------------------------------
-- Dedupe by notification type so re-running this script doesn't spam
-- anyone a second time.
INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'black_sheep_university_announce',
  'Black Sheep University is here',
  'Masterclass-grade creator training is now included with your membership. The first course, a full YouTube Masterclass, is live now.',
  '/black-sheep-university',
  FALSE,
  NOW()
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.user_id = p.user_id
    AND s.status IN ('active', 'trialing')
)
AND NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = p.user_id
    AND n.type = 'black_sheep_university_announce'
);
