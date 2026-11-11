-- Command Center: private product photo storage (admin only).
-- Run once in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.dashboard_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.user_id = auth.uid() AND p.is_admin = TRUE
  );
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_is_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.dashboard_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path  TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  store       TEXT NOT NULL DEFAULT '',
  link        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_products_admin_all ON public.dashboard_products;
CREATE POLICY dashboard_products_admin_all ON public.dashboard_products
  FOR ALL TO authenticated
  USING (public.dashboard_is_admin())
  WITH CHECK (public.dashboard_is_admin() AND auth.uid() = user_id);

-- Private bucket: nothing in it is publicly readable.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('dashboard-products', 'dashboard-products', false, 5242880,
          ARRAY['image/jpeg','image/png','image/webp'])
  ON CONFLICT (id) DO UPDATE
    SET public = FALSE,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admin reads dashboard products"  ON storage.objects;
DROP POLICY IF EXISTS "Admin uploads dashboard products" ON storage.objects;
DROP POLICY IF EXISTS "Admin deletes dashboard products" ON storage.objects;
CREATE POLICY "Admin reads dashboard products"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dashboard-products' AND public.dashboard_is_admin());
CREATE POLICY "Admin uploads dashboard products"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dashboard-products' AND public.dashboard_is_admin()
              AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admin deletes dashboard products"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dashboard-products' AND public.dashboard_is_admin());

-- Check: should return 1 bucket and 3 storage policies.
SELECT
  (SELECT count(*) FROM storage.buckets WHERE id = 'dashboard-products') AS bucket,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND policyname LIKE '%dashboard products') AS policies;
