-- ============================================================
-- MI Moments: public photo carousel for subscribers
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Creates:
--   moments          one row per photo
--   moment_likes     one row per (photo, user); the like count is kept
--                    on moments.like_count by a trigger
--   moment_reports   reports from users (visible to admins only)
--   storage bucket   "moments" (photos are stored at <user id>/<file>)
--   profiles.moments_announced_at   one-time announcement stamp
--
-- Access: only active or trialing subscribers can see, post, like or
-- report. Owners can delete their own photos. Admins can delete any.
-- ============================================================

-- ---------- helper: is the caller a subscriber? ------------------------------
CREATE OR REPLACE FUNCTION public.moments_is_subscriber()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
     WHERE s.user_id = auth.uid()
       AND s.status IN ('active', 'trialing')
  );
$$;
GRANT EXECUTE ON FUNCTION public.moments_is_subscriber() TO authenticated;

CREATE OR REPLACE FUNCTION public.moments_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.user_id = auth.uid() AND p.is_admin = TRUE
  );
$$;
GRANT EXECUTE ON FUNCTION public.moments_is_admin() TO authenticated;

-- ---------- tables ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  like_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moments_created ON public.moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_user ON public.moments(user_id);

CREATE TABLE IF NOT EXISTS public.moment_likes (
  moment_id  UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (moment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.moment_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id        UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (moment_id, reporter_user_id)
);

ALTER TABLE public.moments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_reports ENABLE ROW LEVEL SECURITY;

-- ---------- policies ----------------------------------------------------------
DROP POLICY IF EXISTS moments_read   ON public.moments;
DROP POLICY IF EXISTS moments_insert ON public.moments;
DROP POLICY IF EXISTS moments_delete ON public.moments;
CREATE POLICY moments_read ON public.moments FOR SELECT TO authenticated
  USING (public.moments_is_subscriber());
CREATE POLICY moments_insert ON public.moments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.moments_is_subscriber());
CREATE POLICY moments_delete ON public.moments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.moments_is_admin());

DROP POLICY IF EXISTS moment_likes_read   ON public.moment_likes;
DROP POLICY IF EXISTS moment_likes_insert ON public.moment_likes;
DROP POLICY IF EXISTS moment_likes_delete ON public.moment_likes;
CREATE POLICY moment_likes_read ON public.moment_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY moment_likes_insert ON public.moment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.moments_is_subscriber());
CREATE POLICY moment_likes_delete ON public.moment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS moment_reports_insert ON public.moment_reports;
DROP POLICY IF EXISTS moment_reports_admin_read ON public.moment_reports;
DROP POLICY IF EXISTS moment_reports_admin_delete ON public.moment_reports;
CREATE POLICY moment_reports_insert ON public.moment_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id AND public.moments_is_subscriber());
CREATE POLICY moment_reports_admin_read ON public.moment_reports FOR SELECT TO authenticated
  USING (public.moments_is_admin());
CREATE POLICY moment_reports_admin_delete ON public.moment_reports FOR DELETE TO authenticated
  USING (public.moments_is_admin());

-- ---------- like counter ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moments_bump_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('mitype.moments_internal', '1', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.moments SET like_count = like_count + 1 WHERE id = NEW.moment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.moments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.moment_id;
  END IF;
  PERFORM set_config('mitype.moments_internal', '', true);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_moments_like_count ON public.moment_likes;
CREATE TRIGGER trg_moments_like_count
  AFTER INSERT OR DELETE ON public.moment_likes
  FOR EACH ROW EXECUTE FUNCTION public.moments_bump_like_count();

-- Nobody can edit the like count or the owner directly.
CREATE OR REPLACE FUNCTION public.moments_lock_columns()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND COALESCE(current_setting('mitype.moments_internal', true), '') <> '1' THEN
    NEW.like_count := OLD.like_count;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_moments_lock_columns ON public.moments;
CREATE TRIGGER trg_moments_lock_columns
  BEFORE UPDATE ON public.moments
  FOR EACH ROW EXECUTE FUNCTION public.moments_lock_columns();

-- New photos always start with zero likes.
CREATE OR REPLACE FUNCTION public.moments_zero_likes_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN NEW.like_count := 0; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_moments_zero_likes ON public.moments;
CREATE TRIGGER trg_moments_zero_likes
  BEFORE INSERT ON public.moments
  FOR EACH ROW EXECUTE FUNCTION public.moments_zero_likes_on_insert();

-- ---------- storage ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('moments', 'moments', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
  ON CONFLICT (id) DO UPDATE
    SET file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Moments are publicly readable"  ON storage.objects;
DROP POLICY IF EXISTS "Subscribers upload own moments" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins delete moments" ON storage.objects;
CREATE POLICY "Moments are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'moments');
CREATE POLICY "Subscribers upload own moments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'moments'
              AND auth.uid()::text = (storage.foldername(name))[1]
              AND public.moments_is_subscriber());
CREATE POLICY "Owners and admins delete moments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'moments'
         AND (auth.uid()::text = (storage.foldername(name))[1] OR public.moments_is_admin()));

-- ---------- announcement stamp --------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moments_announced_at TIMESTAMPTZ;

-- ---------- Check ------------------------------------------------------------
-- Expect: tables = 3, policies = 12, bucket = 1.
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('moments','moment_likes','moment_reports')) AS tables,
  (SELECT count(*) FROM pg_policies
    WHERE (schemaname = 'public' AND tablename IN ('moments','moment_likes','moment_reports'))
       OR (schemaname = 'storage' AND policyname IN ('Moments are publicly readable','Subscribers upload own moments','Owners and admins delete moments'))) AS policies,
  (SELECT count(*) FROM storage.buckets WHERE id = 'moments') AS bucket;
