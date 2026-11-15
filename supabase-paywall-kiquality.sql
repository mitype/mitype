-- ============================================================
-- Send @kiquality back to the paywall
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run. No code push needed.
--
-- Removes full access by setting her subscription to canceled and turning
-- off any comped flag. On her next login (or next page load) the app sees
-- no active access and sends her to the subscription page to pay.
--
-- To give her access back later, run:
--   UPDATE public.subscriptions
--      SET status = 'active'
--    WHERE user_id = (SELECT user_id FROM public.profiles
--                      WHERE lower(username) = 'kiquality');
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_comped BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------- Before ----------------------------------------------------
SELECT p.username, s.status, s.is_comped, s.trial_end, s.current_period_end
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.user_id
 WHERE lower(p.username) = 'kiquality';

DO $$
DECLARE
  uid UUID;
BEGIN
  SELECT user_id INTO uid FROM public.profiles WHERE lower(username) = 'kiquality';
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No profile named kiquality was found. Check the username.';
  END IF;

  INSERT INTO public.subscriptions (user_id, status, is_comped, trial_end, current_period_end)
  VALUES (uid, 'canceled', FALSE, NULL, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET status = 'canceled',
        is_comped = FALSE,
        trial_end = NULL,
        current_period_end = NOW(),
        updated_at = NOW();
END $$;

-- ---------- After -----------------------------------------------------
-- Expect: status = canceled, is_comped = false.
SELECT p.username, s.status, s.is_comped, s.trial_end, s.current_period_end
  FROM public.profiles p
  JOIN public.subscriptions s ON s.user_id = p.user_id
 WHERE lower(p.username) = 'kiquality';
