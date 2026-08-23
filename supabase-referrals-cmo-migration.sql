-- ============================================================
-- Referrals + CMO role
-- ============================================================
-- Adds two columns to profiles:
--   1. is_cmo BOOLEAN  — a lightweight role flag for the Chief
--      Marketing Officer. Not an administrator. Only unlocks the
--      "Mi Referrals" nav link + page + info notification.
--   2. referred_by UUID — set once at signup if the user landed on
--      Mitype via ?ref=<@handle>. Immutable after signup so nobody
--      can claim retroactive credit.
--
-- Grants @jensrealitea CMO status.
-- Sends @jensrealitea a one-time info notification explaining how
-- the Mi Referrals page works.
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_cmo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_cmo
  ON public.profiles(is_cmo) WHERE is_cmo = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by
  ON public.profiles(referred_by) WHERE referred_by IS NOT NULL;

UPDATE public.profiles
   SET is_cmo = TRUE
 WHERE lower(username) = 'jensrealitea';

-- ---------- lock down retroactive changes to referred_by --------------
-- A BEFORE UPDATE trigger that forbids anyone (including admins via
-- the client-side SDK) from changing referred_by after it has been
-- initially set. This protects the integrity of the leaderboard.
CREATE OR REPLACE FUNCTION public.freeze_referred_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.referred_by IS DISTINCT FROM NEW.referred_by
     AND OLD.referred_by IS NOT NULL THEN
    RAISE EXCEPTION 'referred_by is immutable after signup.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_referred_by ON public.profiles;
CREATE TRIGGER trg_freeze_referred_by
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.freeze_referred_by();

GRANT EXECUTE ON FUNCTION public.freeze_referred_by() TO authenticated;

-- ---------- CMO can read subscription status ONLY for people they referred ----
-- Layers on top of the existing "read own subscription" + "admins read
-- all" policies. Postgres RLS is OR-based between policies, so this
-- narrowly grants a CMO read access to a subscription row IF the
-- subscribed user's profile has referred_by pointing at that CMO.
-- Non-referred users' subscription rows stay invisible to the CMO.
DROP POLICY IF EXISTS "CMO reads referred users subscriptions" ON public.subscriptions;
CREATE POLICY "CMO reads referred users subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles cmo
      WHERE cmo.user_id = auth.uid()
        AND cmo.is_cmo = TRUE
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles subj
      WHERE subj.user_id = subscriptions.user_id
        AND subj.referred_by = auth.uid()
    )
  );

-- ---------- one-time CMO info notification -----------------------------
INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'cmo_welcome',
  'Welcome to your CMO role',
  'Your Mi Referrals page is now live. Every time someone lands on Mitype via your share link (mitypeapp.com/?ref=@jensrealitea) and creates a profile, their username shows up on your Mi Referrals page along with their current subscription status. Open the burger menu and tap Mi Referrals any time to see your leaderboard grow.',
  '/mi-referrals',
  FALSE,
  NOW()
FROM public.profiles p
WHERE p.is_cmo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = p.user_id AND n.type = 'cmo_welcome'
  );
