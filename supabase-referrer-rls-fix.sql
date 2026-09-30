-- ============================================================
-- Referral program RLS fixes
-- ============================================================
-- Fixes found during the full systems audit:
--
--   1. The existing "CMO reads referred users subscriptions" policy
--      only checked is_cmo = TRUE. Any user granted is_referrer
--      (without also being is_cmo) had NO RLS grant to read the
--      subscription status of the people they referred, so every
--      referred user silently showed as "Not subscribed" on their
--      /mi-referrals page regardless of their real status.
--
--   2. There was no "admins can read all subscriptions" policy in
--      version control. The admin dashboard's bulk subscriptions
--      query relies on the logged-in admin's own RLS grants, so
--      without this, an admin who is not also a CMO/referrer would
--      only ever see their own subscription row, not everyone's.
--
--   3. Documents the is_referrer column in a checked-in migration
--      (it was previously added directly in the Supabase dashboard
--      and was missing from version control).
--
-- Safe to re-run.
-- ============================================================

-- ---------- column (idempotent, in case it wasn't already added) --------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_referrer BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_referrer
  ON public.profiles(is_referrer)
  WHERE is_referrer = TRUE;

-- ---------- fix: referrers (CMO or plain) read their referred users' subs --
DROP POLICY IF EXISTS "CMO reads referred users subscriptions" ON public.subscriptions;

CREATE POLICY "Referrers read referred users subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles referrer
      WHERE referrer.user_id = auth.uid()
        AND (referrer.is_cmo = TRUE OR referrer.is_referrer = TRUE)
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles subj
      WHERE subj.user_id = subscriptions.user_id
        AND subj.referred_by = auth.uid()
    )
  );

-- ---------- fix: admins read every subscription row ----------------------
DROP POLICY IF EXISTS "Admins read all subscriptions" ON public.subscriptions;

CREATE POLICY "Admins read all subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_admin = TRUE
    )
  );
