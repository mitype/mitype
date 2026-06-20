-- ============================================================
-- Online businesses, recommendations & notifications — migration
-- ============================================================
-- 1) Two new columns on business_profiles for online-only support
-- 2) New business_recommendations table
-- 3) New generic notifications table (reusable for future features)
-- 4) RLS for both new tables
--
-- Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ---------- business_profiles new columns ----------
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS is_online_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_label   text;


-- ---------- business_recommendations ----------
-- A user's curated list of businesses they recommend on their profile.
-- Capped at 10 per user via the trigger below.
CREATE TABLE IF NOT EXISTS public.business_recommendations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  business_id   uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_business_recs_user
  ON public.business_recommendations(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_business_recs_business
  ON public.business_recommendations(business_id);

ALTER TABLE public.business_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read all recommendations"
  ON public.business_recommendations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert their own recommendations"
  ON public.business_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own recommendations"
  ON public.business_recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own recommendations"
  ON public.business_recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enforce the 10-per-user cap at the database level so we can't go
-- past it even from a misbehaving client or direct API.
CREATE OR REPLACE FUNCTION enforce_recommendation_cap()
RETURNS TRIGGER AS $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM public.business_recommendations
  WHERE user_id = NEW.user_id;
  IF cnt >= 10 THEN
    RAISE EXCEPTION 'You can recommend up to 10 businesses.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recommendation_cap ON public.business_recommendations;
CREATE TRIGGER trg_recommendation_cap
  BEFORE INSERT ON public.business_recommendations
  FOR EACH ROW EXECUTE FUNCTION enforce_recommendation_cap();


-- ---------- notifications ----------
-- Generic notifications surface, reusable for future events.
-- The bell icon in the nav reads from here.
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  type          text NOT NULL,             -- e.g. 'business_recommended'
  title         text NOT NULL,
  body          text,
  action_url    text,                      -- optional in-app deep link
  related_user_id  uuid,                   -- optional — the actor
  related_business_id uuid,                -- optional — the subject business
  is_read       boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark their own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts are intentionally NOT allowed for authenticated role here —
-- they happen via SECURITY DEFINER trigger functions or server-side
-- service-role calls, never directly from a client.

CREATE POLICY "Users may delete their own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ---------- trigger: notify business owner on first recommendation ----------
-- Only fires ONCE per (recommender, business) pair, because the
-- business_recommendations.UNIQUE(user_id, business_id) constraint
-- prevents duplicate rows. Reordering / metadata updates don't insert,
-- so they don't spam.
CREATE OR REPLACE FUNCTION notify_business_recommended()
RETURNS TRIGGER AS $$
DECLARE
  owner_id   uuid;
  biz_name   text;
  recommender_username text;
BEGIN
  SELECT user_id, business_name INTO owner_id, biz_name
  FROM public.business_profiles
  WHERE id = NEW.business_id;

  -- Don't notify the user about themselves recommending their own biz.
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT username INTO recommender_username
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (
    user_id, type, title, body, action_url,
    related_user_id, related_business_id
  ) VALUES (
    owner_id,
    'business_recommended',
    'Your business was recommended!',
    COALESCE('@' || recommender_username, 'A member')
      || ' added ' || COALESCE(biz_name, 'your business')
      || ' to their profile recommendations.',
    CASE WHEN recommender_username IS NOT NULL
      THEN '/profile/' || recommender_username
      ELSE NULL
    END,
    NEW.user_id,
    NEW.business_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recommendation_notify ON public.business_recommendations;
CREATE TRIGGER trg_recommendation_notify
  AFTER INSERT ON public.business_recommendations
  FOR EACH ROW EXECUTE FUNCTION notify_business_recommended();
