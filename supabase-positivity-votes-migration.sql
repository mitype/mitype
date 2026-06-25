-- Positivity Score — anonymous peer-rating replacing Endorsements.
--
-- Each Mitype member's profile shows an 8-star row that fills 0.5 stars
-- per anonymous vote (so 16 votes = fully filled). Anyone authenticated
-- can tap the stars on someone else's profile to add their vote; one
-- vote per voter-profile pair. The voter's identity is NEVER exposed
-- via the API.
--
-- Anonymity guarantee:
--   - The `positivity_votes` table is locked down by RLS so a voter can
--     only ever see their own row. Nobody can query other people's
--     votes directly.
--   - Aggregate counts and "have I voted" lookups are exposed through
--     two SECURITY DEFINER RPCs that return only what the caller is
--     allowed to see.
--   - Anyone trying to read the table directly to discover who voted
--     for whom gets RLS-blocked at the postgres layer.

CREATE TABLE IF NOT EXISTS public.positivity_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (voter_id, voted_user_id),
  CHECK (voter_id <> voted_user_id)
);

CREATE INDEX IF NOT EXISTS positivity_votes_voted_idx
  ON public.positivity_votes (voted_user_id);

ALTER TABLE public.positivity_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS positivity_votes_select_own ON public.positivity_votes;
CREATE POLICY positivity_votes_select_own ON public.positivity_votes
  FOR SELECT TO authenticated
  USING (voter_id = auth.uid());

DROP POLICY IF EXISTS positivity_votes_insert_own ON public.positivity_votes;
CREATE POLICY positivity_votes_insert_own ON public.positivity_votes
  FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND voter_id <> voted_user_id);

DROP POLICY IF EXISTS positivity_votes_delete_own ON public.positivity_votes;
CREATE POLICY positivity_votes_delete_own ON public.positivity_votes
  FOR DELETE TO authenticated
  USING (voter_id = auth.uid());

-- Aggregate count (anonymous): how many people have voted for this user?
CREATE OR REPLACE FUNCTION public.get_positivity_count(target_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.positivity_votes
  WHERE voted_user_id = target_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_positivity_count(UUID) TO authenticated;

-- Has the current viewer voted for this target?
CREATE OR REPLACE FUNCTION public.has_voted_positivity(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.positivity_votes
    WHERE voter_id = auth.uid() AND voted_user_id = target_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_voted_positivity(UUID) TO authenticated;
