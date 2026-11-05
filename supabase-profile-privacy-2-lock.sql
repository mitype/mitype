-- ============================================================
-- Profile privacy, STEP 2 of 2: lock the private columns
-- ============================================================
-- Run ONLY AFTER the new code is live and you have checked the site
-- (Discover, a profile, Edit Profile, a signed-out profile link).
-- Safe to re-run. To undo instantly, run supabase-profile-privacy-rollback.sql.
--
-- After this:
--   * Signed-out visitors can read ONLY the public fields of a profile.
--   * Signed-in members can read everything except OTHER people's exact
--     birth date (they see age). A member reads their own birth date
--     through get_my_date_of_birth().
--
-- When you add a new column to profiles later, run:
--   SELECT public.lock_profile_columns();
--   SELECT public.refresh_profile_privacy();
-- so the new column is readable by the app.
-- ============================================================

CREATE OR REPLACE FUNCTION public.lock_profile_columns()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_cols TEXT;
  anon_cols   TEXT;
  public_list TEXT[] := ARRAY[
    'id','user_id','username','bio','avatar_url','categories','social_links',
    'website_url','created_at','updated_at','portfolio_links','creative_status',
    'profile_prompts','photos','city','state','open_to_collab','collab_pitch',
    'featured_wave_id','latest_project_url','featured_current_id',
    'available_for_work','available_for_coffee','skill_tags'
  ];
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO member_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name <> 'date_of_birth';

  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO anon_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name = ANY (public_list);

  REVOKE SELECT ON public.profiles FROM PUBLIC, anon, authenticated;
  EXECUTE 'GRANT SELECT (' || member_cols || ') ON public.profiles TO authenticated';
  EXECUTE 'GRANT SELECT (' || anon_cols   || ') ON public.profiles TO anon';
END;
$$;
REVOKE ALL ON FUNCTION public.lock_profile_columns() FROM PUBLIC, anon, authenticated;

SELECT public.lock_profile_columns();

-- Check: expect  anon_dob = false, member_dob = false, member_username = true.
SELECT
  has_column_privilege('anon',          'public.profiles', 'date_of_birth', 'SELECT') AS anon_dob,
  has_column_privilege('authenticated', 'public.profiles', 'date_of_birth', 'SELECT') AS member_dob,
  has_column_privilege('authenticated', 'public.profiles', 'username',      'SELECT') AS member_username;
