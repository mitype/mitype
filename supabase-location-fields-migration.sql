-- ============================================================
-- Location fields + travel mode — migration
-- ============================================================
-- Adds city + state to profiles for the Discover "find people in
-- your city / state" filter, plus a travel-mode override (temporary
-- city/state with an expiration date) for creators visiting another
-- area for a shoot, festival, conference, etc.
--
-- The existing `zip_code` column stays as the canonical
-- regional/postal field. City + state are display-friendly + filter-
-- friendly companions.
--
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS travel_city TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS travel_state TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS travel_ends_at TIMESTAMPTZ;

-- Lower-cased helpers for case-insensitive matching on the Discover
-- filter. We index these so the filter query stays fast as the user
-- base grows.
CREATE INDEX IF NOT EXISTS idx_profiles_state_lower
  ON public.profiles(lower(state));

CREATE INDEX IF NOT EXISTS idx_profiles_city_lower
  ON public.profiles(lower(city));
