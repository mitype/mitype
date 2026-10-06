-- ============================================================
-- Referral link setup for @lechefgrewsum33
-- ============================================================
-- Does two things:
--   1. Sets is_referrer = TRUE on their profile. This converts their
--      profile share link (mitypeapp.com/?ref=<username>) into a
--      tracked referral link and adds "Mi Referrals" to their burger
--      menu.
--   2. Sends them a one-time notification for their next login.
--
-- Safe to re-run.
-- ============================================================

UPDATE public.profiles
   SET is_referrer = TRUE
 WHERE lower(username) = 'lechefgrewsum33';

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
WHERE lower(p.username) = 'lechefgrewsum33'
  AND p.is_referrer = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = p.user_id AND n.type = 'referrer_welcome'
  );

-- Check: should return one row with is_referrer = true and one notification.
SELECT p.username, p.is_referrer, p.founders_50_opted_in,
       (SELECT count(*) FROM public.notifications n
         WHERE n.user_id = p.user_id AND n.type = 'referrer_welcome') AS welcome_notifications
  FROM public.profiles p
 WHERE lower(p.username) = 'lechefgrewsum33';
