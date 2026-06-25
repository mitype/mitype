-- The Current — Mitype's text-post feed.
--
-- Threads-style public feed of 500-character posts called "currents".
-- Each current can @mention any user, business, or Mi Home Goods
-- listing; the feed renders those mentions as inline rich-embed cards.
-- Echoes (likes), threaded replies, and a per-session vortex entry
-- animation are the visual signature.
--
-- Subscription-gated for posting (same as Wave / Mi Home Goods sellers).
-- Reading is open to any authenticated member.

-- ---------- currents table -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.currents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body         TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  parent_id    UUID NULL REFERENCES public.currents(id) ON DELETE CASCADE,
  echo_count   INTEGER NOT NULL DEFAULT 0,
  reply_count  INTEGER NOT NULL DEFAULT 0,
  is_removed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS currents_user_idx          ON public.currents (user_id);
CREATE INDEX IF NOT EXISTS currents_parent_idx        ON public.currents (parent_id) WHERE parent_id IS NOT NULL;
-- Top-level feed query: parent_id IS NULL AND NOT is_removed, ordered by created_at desc.
CREATE INDEX IF NOT EXISTS currents_feed_idx          ON public.currents (created_at DESC) WHERE parent_id IS NULL AND is_removed = FALSE;

-- Auto-bump updated_at on UPDATE.
CREATE OR REPLACE FUNCTION public.currents_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS currents_set_updated_at ON public.currents;
CREATE TRIGGER currents_set_updated_at
  BEFORE UPDATE ON public.currents
  FOR EACH ROW EXECUTE FUNCTION public.currents_set_updated_at();

-- Auto-bump parent reply_count on insert + delete.
CREATE OR REPLACE FUNCTION public.currents_bump_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE public.currents SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE public.currents SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS currents_bump_reply_count ON public.currents;
CREATE TRIGGER currents_bump_reply_count
  AFTER INSERT OR DELETE ON public.currents
  FOR EACH ROW EXECUTE FUNCTION public.currents_bump_reply_count();

-- ---------- current_echoes table -----------------------------------------
-- One row per (user, current). Like / unlike toggle.
CREATE TABLE IF NOT EXISTS public.current_echoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_id  UUID NOT NULL REFERENCES public.currents(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (current_id, user_id)
);

CREATE INDEX IF NOT EXISTS current_echoes_user_idx     ON public.current_echoes (user_id);
CREATE INDEX IF NOT EXISTS current_echoes_current_idx  ON public.current_echoes (current_id);

-- Auto-bump current.echo_count on insert + delete.
CREATE OR REPLACE FUNCTION public.current_echoes_bump_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.currents SET echo_count = echo_count + 1 WHERE id = NEW.current_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.currents SET echo_count = GREATEST(echo_count - 1, 0) WHERE id = OLD.current_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS current_echoes_bump_count ON public.current_echoes;
CREATE TRIGGER current_echoes_bump_count
  AFTER INSERT OR DELETE ON public.current_echoes
  FOR EACH ROW EXECUTE FUNCTION public.current_echoes_bump_count();

-- ---------- profiles.featured_current_id (pin-to-profile, v1.1 hook) -----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS featured_current_id UUID NULL
    REFERENCES public.currents(id) ON DELETE SET NULL;

-- ---------- RLS ----------------------------------------------------------
ALTER TABLE public.currents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_echoes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read non-removed currents.
DROP POLICY IF EXISTS currents_read ON public.currents;
CREATE POLICY currents_read ON public.currents
  FOR SELECT
  TO authenticated
  USING (is_removed = FALSE);

-- Posting requires an active or trialing subscription.
DROP POLICY IF EXISTS currents_insert ON public.currents;
CREATE POLICY currents_insert ON public.currents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.status IN ('active', 'trialing')
    )
  );

-- Author can soft-delete their own currents (sets is_removed = TRUE).
DROP POLICY IF EXISTS currents_update ON public.currents;
CREATE POLICY currents_update ON public.currents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS currents_delete ON public.currents;
CREATE POLICY currents_delete ON public.currents
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Echoes: anyone authenticated can read; any subscriber can echo their own row.
DROP POLICY IF EXISTS current_echoes_read ON public.current_echoes;
CREATE POLICY current_echoes_read ON public.current_echoes
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS current_echoes_insert ON public.current_echoes;
CREATE POLICY current_echoes_insert ON public.current_echoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.status IN ('active', 'trialing')
    )
  );

DROP POLICY IF EXISTS current_echoes_delete ON public.current_echoes;
CREATE POLICY current_echoes_delete ON public.current_echoes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
