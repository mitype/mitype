-- ============================================================
-- Small Business Profiles — migration
-- ============================================================
-- Adds three tables, one storage bucket, and the RLS policies
-- to support every user optionally publishing a small business
-- profile linked to their existing personal profile.
--
-- Run this once in Supabase SQL Editor (or via the CLI).
-- Safe to re-run — every CREATE uses IF NOT EXISTS.
-- ============================================================

-- ---------- business_profiles ----------
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  business_name   text NOT NULL,
  category        text,
  logo_url        text,
  about_services  text,
  phone           text,
  email           text,
  website         text,
  address_line    text,
  city            text,
  state           text,
  zip_code        text,
  hide_address    boolean DEFAULT false,
  social_links    jsonb DEFAULT '{}'::jsonb,
  is_published    boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_zip
  ON public.business_profiles(zip_code) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_business_profiles_category
  ON public.business_profiles(category) WHERE is_published = true;

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Only logged-in members can read published business profiles.
CREATE POLICY "Members can read published business profiles"
  ON public.business_profiles FOR SELECT
  TO authenticated
  USING (is_published = true OR auth.uid() = user_id);

CREATE POLICY "Users insert their own business profile"
  ON public.business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own business profile"
  ON public.business_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own business profile"
  ON public.business_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ---------- business_events ----------
CREATE TABLE IF NOT EXISTS public.business_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  event_date      timestamptz NOT NULL,
  location_name   text,
  location_address text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_events_business
  ON public.business_events(business_id, event_date);
CREATE INDEX IF NOT EXISTS idx_business_events_future
  ON public.business_events(event_date) WHERE event_date >= now();

ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read business events"
  ON public.business_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners manage their business events"
  ON public.business_events FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------- business_saves ----------
-- A user can save a business they like; saves are surfaced in the
-- Messages center under the purple "Small Business Saves" tab.
CREATE TABLE IF NOT EXISTS public.business_saves (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_business_saves_user
  ON public.business_saves(user_id, created_at DESC);

ALTER TABLE public.business_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own saves"
  ON public.business_saves FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own saves"
  ON public.business_saves FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------- storage bucket for business logos ----------
INSERT INTO storage.buckets (id, name, public)
  VALUES ('business-logos', 'business-logos', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "Business logos are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'business-logos');

CREATE POLICY "Users upload their own business logo"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own business logo"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own business logo"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ---------- auto-update updated_at on business_profiles ----------
DROP TRIGGER IF EXISTS trg_business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
