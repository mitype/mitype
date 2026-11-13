-- ============================================================
-- Profile banners
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Adds profiles.banner_url, a public "banners" storage bucket for
-- member uploads, and makes banner_url readable on profile pages
-- (signed in and signed out).
--
-- banner_url holds either:
--   lib:<id>          a preloaded library banner (files ship with the app)
--   up:<uid>/<stamp>  a member upload (files in the "banners" bucket)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- One-time announcement stamp (the dashboard shows the new-feature modal once).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_announced_at TIMESTAMPTZ;

-- Only allow the two known shapes, and keep it short.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_banner_url_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_banner_url_check
  CHECK (banner_url IS NULL OR (
    length(banner_url) <= 120
    AND (banner_url ~ '^lib:[a-z0-9-]+$' OR banner_url ~ '^up:[0-9a-fA-F-]{36}/[0-9a-z-]+$')
  ));

-- ---------- storage ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('banners', 'banners', true, 6291456, ARRAY['image/webp','image/jpeg'])
  ON CONFLICT (id) DO UPDATE
    SET file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Banners are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Members upload own banners"    ON storage.objects;
DROP POLICY IF EXISTS "Members delete own banners"    ON storage.objects;
CREATE POLICY "Banners are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Members upload own banners"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Members delete own banners"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------- make banner_url readable (adds it to the public list) --------------
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
    'available_for_work','available_for_coffee','skill_tags','banner_url'
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
    'available_for_work','available_for_coffee','skill_tags','banner_url'
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

SELECT public.lock_profile_columns();
SELECT public.refresh_profile_privacy();

-- Check: expect banner_col = 1, bucket = 1, anon_banner = true, anon_dob = false.
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'banner_url') AS banner_col,
  (SELECT count(*) FROM storage.buckets WHERE id = 'banners') AS bucket,
  has_column_privilege('anon', 'public.profiles', 'banner_url',    'SELECT') AS anon_banner,
  has_column_privilege('anon', 'public.profiles', 'date_of_birth', 'SELECT') AS anon_dob;
