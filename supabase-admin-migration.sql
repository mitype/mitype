-- ============================================================
-- Admin role + new-user notification blast
-- ============================================================
-- Adds:
--   1. `is_admin` boolean column on profiles (default false).
--   2. Sets @yasom to admin.
--   3. Trigger on `profiles` INSERT that pings every admin with an
--      "@newuser just joined" notification.
--
-- Future admins: to grant or revoke, run:
--   UPDATE public.profiles SET is_admin = TRUE  WHERE username = 'someuser';
--   UPDATE public.profiles SET is_admin = FALSE WHERE username = 'someuser';
--
-- Safe to re-run.
-- ============================================================

-- ---------- column ------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON public.profiles(is_admin)
  WHERE is_admin = TRUE;

-- ---------- grant admin to @yasom ---------------------------------------
UPDATE public.profiles
   SET is_admin = TRUE
 WHERE lower(username) = 'yasom';

-- ---------- new-signup notification trigger -----------------------------
-- Fires AFTER a new profile row is inserted (i.e., a new user has just
-- finished signup). Sends one notification to every admin with a link
-- straight to the new user's profile.
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, body, action_url, related_user_id, is_read, created_at
  )
  SELECT
    admin.user_id,
    'new_signup',
    'New user just joined',
    '@' || COALESCE(NEW.username, 'unknown') || ' just created a profile on Mitype.',
    '/profile/' || COALESCE(NEW.username, ''),
    NEW.user_id,
    FALSE,
    NOW()
  FROM public.profiles admin
  WHERE admin.is_admin = TRUE
    AND admin.user_id <> NEW.user_id;  -- don't ping yourself if you're setting up admin
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_new_user ON public.profiles;
CREATE TRIGGER trg_notify_admins_on_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_user();

GRANT EXECUTE ON FUNCTION public.notify_admins_on_new_user() TO authenticated;
