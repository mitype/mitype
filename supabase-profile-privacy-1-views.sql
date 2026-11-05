-- ============================================================
-- Profile privacy, STEP 1 of 2: add safe views (changes nothing yet)
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run. Nothing the site
-- does today is affected by this step; it only ADDS things the new code
-- uses.
--
-- Adds:
--   profiles_directory  every profile column EXCEPT date_of_birth, plus a
--                       computed age_years. For signed-in members.
--   profiles_public     only the fields meant for signed-out visitors.
--   get_my_date_of_birth()  lets a member read ONLY their own birth date.
--   refresh_profile_privacy()  rebuilds the two views. Run it again any
--                       time you add a column to profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_date_of_birth()
RETURNS DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_of_birth FROM public.profiles WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_date_of_birth() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_date_of_birth() TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_profile_privacy()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  all_cols TEXT;
  pub_cols TEXT;
  public_list TEXT[] := ARRAY[
    'id','user_id','username','bio','avatar_url','categories','social_links',
    'website_url','created_at','updated_at','portfolio_links','creative_status',
    'profile_prompts','photos','city','state','open_to_collab','collab_pitch',
    'featured_wave_id','latest_project_url','featured_current_id',
    'available_for_work','available_for_coffee','skill_tags'
  ];
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO all_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name <> 'date_of_birth';

  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO pub_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name = ANY (public_list);

  DROP VIEW IF EXISTS public.profiles_directory;
  DROP VIEW IF EXISTS public.profiles_public;

  EXECUTE 'CREATE VIEW public.profiles_directory AS SELECT ' || all_cols ||
          ', CASE WHEN date_of_birth IS NULL THEN NULL ' ||
          'ELSE GREATEST(0, date_part(''year'', age(CURRENT_DATE, date_of_birth))::INT) END AS age_years ' ||
          'FROM public.profiles';
  EXECUTE 'CREATE VIEW public.profiles_public AS SELECT ' || pub_cols ||
          ' FROM public.profiles';

  REVOKE ALL ON public.profiles_directory FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON public.profiles_public    FROM PUBLIC, anon, authenticated;
  GRANT SELECT ON public.profiles_directory TO authenticated;
  GRANT SELECT ON public.profiles_public    TO anon, authenticated;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_profile_privacy() FROM PUBLIC, anon, authenticated;

SELECT public.refresh_profile_privacy();

-- Check: expect 2 rows (the two views).
SELECT table_name FROM information_schema.views
 WHERE table_schema = 'public' AND table_name IN ('profiles_directory', 'profiles_public');
