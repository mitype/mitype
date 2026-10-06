-- ============================================================
-- Amazon Seller Masterclass launch announcement
-- ============================================================
-- Adds profiles.amazon_masterclass_announced_at (one-time modal flag)
-- and a one-time notification to every active/trialing subscriber.
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS amazon_masterclass_announced_at TIMESTAMPTZ;

INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'amazon_masterclass_announce',
  'New masterclass: Amazon Seller',
  'The Amazon Seller Masterclass is now live in Black Sheep University, included with your membership.',
  '/black-sheep-university/amazon',
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
    AND n.type = 'amazon_masterclass_announce'
);

-- Check
SELECT COUNT(*) AS notified FROM public.notifications WHERE type = 'amazon_masterclass_announce';
