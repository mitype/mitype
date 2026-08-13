-- ============================================================
-- Founders 50 Rewards Program
-- ============================================================
-- Adds:
--   1. Two columns on profiles:
--        - founders_50_opted_in       BOOLEAN, default false
--        - founders_50_prompted_at    TIMESTAMPTZ, tracks first modal show
--   2. RLS enforcement: users can only flip the opt-in flag to TRUE if
--      they have an active or trialing subscription. Guards against a
--      non-subscriber editing the request client-side.
--   3. A one-time notification blast to every existing user telling
--      them about the program.
--
-- Safe to re-run.
-- ============================================================

-- ---------- columns -----------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founders_50_opted_in    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS founders_50_prompted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_founders_50_opted_in
  ON public.profiles(founders_50_opted_in)
  WHERE founders_50_opted_in = TRUE;

-- ---------- subscription-gated opt-in enforcement -----------------------
-- A trigger that fires BEFORE any profile UPDATE where the opt-in flag
-- is being flipped from FALSE → TRUE. If the user doesn't have an active
-- or trialing subscription, the UPDATE is rejected with a clear error.
-- The client-side toggle already guards this, but this catches anyone
-- who bypasses the UI (browser DevTools, direct API call).
CREATE OR REPLACE FUNCTION public.enforce_founders_50_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the flag is being toggled ON (false → true).
  -- Toggling OFF is always allowed.
  IF NEW.founders_50_opted_in = TRUE
     AND (OLD.founders_50_opted_in IS DISTINCT FROM TRUE) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = NEW.user_id
        AND s.status IN ('active', 'trialing')
    ) THEN
      RAISE EXCEPTION 'Subscribe to opt in to the Founders 50 Rewards Program.'
        USING ERRCODE = 'check_violation';
    END IF;
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

-- ---------- one-time notification blast ---------------------------------
-- Sends every existing user a notification about the program. Subscribed
-- users get an "opt in now" call to action; non-subscribed users get a
-- "subscribe to opt in" version. Both link to /subscription.
-- Dedupe by notification type so re-running doesn't spam anyone.
INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'founders_50_announce',
  'Founders 50 Rewards Program',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p.user_id
        AND s.status IN ('active', 'trialing')
    )
    THEN 'Mitype is launching a Creator Rewards program for our early users. Opt in now to reserve your spot.'
    ELSE 'Mitype is launching a Creator Rewards program for our early users. Subscribe to become eligible and opt in.'
  END,
  '/subscription',
  FALSE,
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = p.user_id
    AND n.type = 'founders_50_announce'
);
