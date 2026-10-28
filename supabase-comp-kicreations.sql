-- ============================================================
-- Complimentary access for @kicreations + Founders 50 referral program
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Run this BEFORE the code push, because the code reads the new
-- subscriptions.is_comped column.
--
-- 1. Adds subscriptions.is_comped. A comped member is treated as an
--    active subscriber everywhere, and PayPal events and checkout
--    attempts never change their access.
-- 2. Gives @kicreations a comped active membership (no expiry).
-- 3. Opts @kicreations in to the Founders 50 referral program.
--
-- To put her back behind the paywall later, run:
--   UPDATE public.subscriptions
--      SET is_comped = FALSE, status = 'canceled'
--    WHERE user_id = (SELECT user_id FROM public.profiles
--                      WHERE lower(username) = 'kicreations');
-- (and she is removed from the Founders 50 automatically).
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_comped BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
DECLARE
  uid UUID;
BEGIN
  SELECT user_id INTO uid FROM public.profiles WHERE lower(username) = 'kicreations';
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No profile named kicreations was found. Check the username.';
  END IF;

  INSERT INTO public.subscriptions (user_id, status, is_comped, current_period_end, trial_end)
  VALUES (uid, 'active', TRUE, '2099-12-31', NULL)
  ON CONFLICT (user_id) DO UPDATE
    SET status = 'active',
        is_comped = TRUE,
        current_period_end = '2099-12-31',
        trial_end = NULL,
        updated_at = NOW();

  -- Founders 50: the opt in trigger turns on the referral link, Mi
  -- Referrals and the welcome notification. is_referrer is also set
  -- here so it works even on an older trigger.
  UPDATE public.profiles
     SET founders_50_opted_in = TRUE,
         is_referrer = TRUE
   WHERE user_id = uid;
END $$;

-- ---------- Check -----------------------------------------------------
-- Expect: status = active, is_comped = true, opted_in = true, referrer = true.
SELECT p.username, s.status, s.is_comped,
       p.founders_50_opted_in AS opted_in, p.is_referrer AS referrer
  FROM public.profiles p
  JOIN public.subscriptions s ON s.user_id = p.user_id
 WHERE lower(p.username) = 'kicreations';
