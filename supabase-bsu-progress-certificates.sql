-- ============================================================
-- Black Sheep University: saved progress and certificates
-- ============================================================
-- Adds two tables so lesson progress survives refreshes and devices,
-- and so each graduate keeps the date they completed a masterclass.
--   bsu_progress      one row per completed lesson
--   bsu_certificates  one row per completed masterclass
-- Each user can only read and write their own rows.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bsu_progress (
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course       TEXT        NOT NULL,
  lesson_id    TEXT        NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.bsu_certificates (
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course       TEXT        NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course)
);

ALTER TABLE public.bsu_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsu_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bsu_progress_select_own" ON public.bsu_progress;
CREATE POLICY "bsu_progress_select_own" ON public.bsu_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bsu_progress_insert_own" ON public.bsu_progress;
CREATE POLICY "bsu_progress_insert_own" ON public.bsu_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bsu_progress_update_own" ON public.bsu_progress;
CREATE POLICY "bsu_progress_update_own" ON public.bsu_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bsu_certificates_select_own" ON public.bsu_certificates;
CREATE POLICY "bsu_certificates_select_own" ON public.bsu_certificates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bsu_certificates_insert_own" ON public.bsu_certificates;
CREATE POLICY "bsu_certificates_insert_own" ON public.bsu_certificates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.bsu_progress     TO authenticated;
GRANT SELECT, INSERT         ON public.bsu_certificates TO authenticated;

-- Check: both tables should be listed with rowsecurity = true.
SELECT tablename, rowsecurity
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('bsu_progress', 'bsu_certificates');
