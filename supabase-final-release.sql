-- ============================================================
-- Mitype final release SQL (run this once in the Supabase SQL editor)
-- ============================================================
-- Includes, in order:
--   1. Black Sheep University announcement (column + notification)
--   2. Amazon Seller Masterclass announcement (column + notification)
--   3. Cottage Bakery Masterclass announcement (column + notification)
--   4. Saved lesson progress and certificates (two tables with RLS)
-- Every statement is safe to re-run. Nothing is deleted or changed
-- for existing data. Announcement notifications go only to active or
-- trialing subscribers and are never sent twice to the same person.
-- ============================================================

-- ---------- 1. Black Sheep University announcement ----------------
-- ---------- column -------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS black_sheep_university_announced_at TIMESTAMPTZ;

-- ---------- one-time notification blast -----------------------------------
-- Dedupe by notification type so re-running this script doesn't spam
-- anyone a second time.
INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'black_sheep_university_announce',
  'Black Sheep University is here',
  'Masterclass-grade creator training is now included with your membership. The first course, a full YouTube Masterclass, is live now.',
  '/black-sheep-university',
  FALSE,
  NOW()
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.user_id = p.user_id
    AND s.status IN ('active', 'trialing')
)
AND NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = p.user_id
    AND n.type = 'black_sheep_university_announce'
);


-- ---------- 2. Amazon Seller Masterclass announcement -------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS amazon_masterclass_announced_at TIMESTAMPTZ;

INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'amazon_masterclass_announce',
  'New masterclass: Amazon Seller',
  'The Amazon Seller Masterclass is now live in Black Sheep University, included with your membership.',
  '/black-sheep-university/amazon',
  FALSE,
  NOW()
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.user_id = p.user_id
    AND s.status IN ('active', 'trialing')
)
AND NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = p.user_id
    AND n.type = 'amazon_masterclass_announce'
);


-- ---------- 3. Cottage Bakery Masterclass announcement ------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cottage_bakery_announced_at TIMESTAMPTZ;

INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'cottage_bakery_announce',
  'New masterclass: Cottage Bakery',
  'The Cottage Bakery Masterclass is now live in Black Sheep University, included with your membership. It covers the cottage food rules for all 50 states, food safety, packaging, labels, pricing, and selling.',
  '/black-sheep-university/cottage-bakery',
  FALSE,
  NOW()
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.user_id = p.user_id
    AND s.status IN ('active', 'trialing')
)
AND NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = p.user_id
    AND n.type = 'cottage_bakery_announce'
);

-- ---------- 4. Saved progress and certificates --------------------
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


-- ---------- Final check -------------------------------------------
-- Expect: three announcement columns exist (3 rows), both tables have
-- row level security on, and notification counts match subscribers.
SELECT 'column ' || column_name AS item, 'present' AS status
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'profiles'
   AND column_name IN ('black_sheep_university_announced_at',
                       'amazon_masterclass_announced_at',
                       'cottage_bakery_announced_at')
UNION ALL
SELECT 'table ' || tablename, CASE WHEN rowsecurity THEN 'RLS on' ELSE 'RLS OFF' END
  FROM pg_tables
 WHERE schemaname = 'public' AND tablename IN ('bsu_progress', 'bsu_certificates')
UNION ALL
SELECT 'notifications ' || type, count(*)::text
  FROM public.notifications
 WHERE type IN ('black_sheep_university_announce', 'amazon_masterclass_announce', 'cottage_bakery_announce')
 GROUP BY type;
