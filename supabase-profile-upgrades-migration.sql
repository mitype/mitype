-- ============================================================
-- Profile page upgrades — migration
-- ============================================================
-- Adds three new optional fields to profiles + creates the
-- profile_endorsements table:
--
--   profiles.open_to_collab    bool  → toggle in Edit Profile
--   profiles.collab_pitch      text  → "what kind of collab" details
--   profiles.featured_wave_id  uuid  → the Wave video pinned to top of profile
--
--   profile_endorsements (table) — a short text endorsement left by
--     ONE creator on another creator's profile. Only members the
--     viewed creator is connected with (approved DM) can leave one.
--     One endorsement per endorser→endorsed pair (re-saving updates
--     the existing row).
--
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS open_to_collab BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS collab_pitch TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS featured_wave_id UUID
    REFERENCES public.wave_videos(id) ON DELETE SET NULL;

-- ─────────────────────── Endorsements table ────────────────────────

CREATE TABLE IF NOT EXISTS public.profile_endorsements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endorsed_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 240),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endorser_id, endorsed_id)
);

CREATE INDEX IF NOT EXISTS idx_endorsements_endorsed
  ON public.profile_endorsements(endorsed_id, created_at DESC);

ALTER TABLE public.profile_endorsements ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read endorsements (they're public on the
-- profile page).
DROP POLICY IF EXISTS "Endorsements are public" ON public.profile_endorsements;
CREATE POLICY "Endorsements are public"
  ON public.profile_endorsements FOR SELECT
  TO authenticated
  USING (true);

-- A creator can insert an endorsement for someone they have an
-- approved DM conversation with. Self-endorsements are blocked.
DROP POLICY IF EXISTS "Connected creators write endorsements" ON public.profile_endorsements;
CREATE POLICY "Connected creators write endorsements"
  ON public.profile_endorsements FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = endorser_id
    AND endorser_id <> endorsed_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.status = 'approved'
        AND c.kind = 'dm'
        AND endorser_id = ANY(c.participant_ids)
        AND endorsed_id = ANY(c.participant_ids)
    )
  );

-- The endorser can update their own endorsement (re-word it).
DROP POLICY IF EXISTS "Endorsers update their own" ON public.profile_endorsements;
CREATE POLICY "Endorsers update their own"
  ON public.profile_endorsements FOR UPDATE
  TO authenticated
  USING (auth.uid() = endorser_id);

-- Endorser or endorsed user can delete (endorser to retract, endorsed
-- to hide a weird one).
DROP POLICY IF EXISTS "Endorser or endorsed can delete" ON public.profile_endorsements;
CREATE POLICY "Endorser or endorsed can delete"
  ON public.profile_endorsements FOR DELETE
  TO authenticated
  USING (auth.uid() = endorser_id OR auth.uid() = endorsed_id);

-- Auto-bump updated_at on edits. We piggyback on the existing
-- update_updated_at helper from supabase-schema.sql.
DROP TRIGGER IF EXISTS trg_endorsements_updated_at ON public.profile_endorsements;
CREATE TRIGGER trg_endorsements_updated_at
  BEFORE UPDATE ON public.profile_endorsements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
