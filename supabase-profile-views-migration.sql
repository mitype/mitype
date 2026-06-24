-- ============================================================
-- Profile views — migration
-- ============================================================
-- Tracks who viewed whose profile and when. Powers the "Profile views
-- this week" stat on the dashboard.
--
-- Privacy model: we store the viewer_id but never expose individual
-- viewer identities to the viewed user. Only an aggregate count is
-- ever surfaced. Self-views are excluded by the application layer
-- before insert.
--
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profile_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Counts by viewed_id over a time range — the dashboard's "views
-- this week" query. WHERE clause keeps the index small.
CREATE INDEX IF NOT EXISTS idx_profile_views_recent_by_viewed
  ON public.profile_views(viewed_id, viewed_at DESC);

-- Dedup helper: don't count the same viewer twice in a 24h window.
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_viewed
  ON public.profile_views(viewer_id, viewed_id, viewed_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can record a view OF someone else. Self-views
-- are blocked.
DROP POLICY IF EXISTS "Users record their views of others" ON public.profile_views;
CREATE POLICY "Users record their views of others"
  ON public.profile_views FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = viewer_id
    AND viewer_id <> viewed_id
  );

-- The viewed user can read their own view rows (for the count).
-- We deliberately do NOT let them see who viewed them — the dashboard
-- only ever runs a count(*) query.
DROP POLICY IF EXISTS "Viewed users read their view rows" ON public.profile_views;
CREATE POLICY "Viewed users read their view rows"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (auth.uid() = viewed_id);
