-- UNDO for supabase-profile-privacy-2-lock.sql.
-- Restores the previous open read access on profiles immediately.
-- (The two views and the helper functions can stay; they are harmless.)
GRANT SELECT ON public.profiles TO anon, authenticated;
SELECT 'profiles read access restored' AS status;
