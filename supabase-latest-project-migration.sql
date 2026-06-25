-- Latest Project URL on profiles
--
-- Adds an optional clickable URL field to the "Latest Project"
-- (previously labeled "Creative Status") section of a member's profile.
-- We keep the existing `creative_status` text column as the description
-- — the migration is just additive.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latest_project_url TEXT;

COMMENT ON COLUMN public.profiles.latest_project_url IS
  'Optional clickable link rendered next to the Latest Project status on the public profile.';
