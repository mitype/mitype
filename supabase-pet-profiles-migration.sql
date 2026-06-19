-- ============================================================
-- Pet Profiles (hanging dog tags feature) — migration
-- ============================================================
-- Adds one table, one storage bucket, and RLS policies. Each user can
-- optionally publish one or more pet profiles that render as hanging
-- dog tags over their main profile photo.
--
-- Run this once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ---------- pet_profiles ----------
CREATE TABLE IF NOT EXISTS public.pet_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name            text NOT NULL,
  pet_type        text,                              -- 'dog' | 'cat' | 'bird' | etc.
  birthday        date,
  fav_activity    text,
  fav_food        text,
  bio             text,                              -- capped at 200 chars by the app
  photo_url       text,
  tag_color       text DEFAULT 'gold',               -- key from TAG_COLORS list
  display_order   integer DEFAULT 0,                 -- left-to-right ordering of tags
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_profiles_user
  ON public.pet_profiles(user_id, display_order);

ALTER TABLE public.pet_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read pet profiles"
  ON public.pet_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert their own pets"
  ON public.pet_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own pets"
  ON public.pet_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own pets"
  ON public.pet_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ---------- storage bucket for pet photos ----------
INSERT INTO storage.buckets (id, name, public)
  VALUES ('pet-photos', 'pet-photos', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "Pet photos are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'pet-photos');

CREATE POLICY "Users upload their own pet photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own pet photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own pet photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ---------- auto-update updated_at on pet_profiles ----------
DROP TRIGGER IF EXISTS trg_pet_profiles_updated_at ON public.pet_profiles;
CREATE TRIGGER trg_pet_profiles_updated_at
  BEFORE UPDATE ON public.pet_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
