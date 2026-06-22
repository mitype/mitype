-- ============================================================
-- Game Sessions (real-time multiplayer games) — migration
-- ============================================================
-- One row per active game between two members of a conversation.
-- State is stored as JSONB so each game type can define its own
-- shape without schema changes.
--
-- After a game ends (status='ended'), rows can be deleted any time
-- — there's no resume-later feature. The app deletes the row when
-- both players acknowledge the result, keeping storage clean.
--
-- Realtime: enable Supabase Realtime on this table after running
-- (Database → Replication → toggle public.game_sessions ON).
--
-- Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id      uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  -- Free-form key — 'wyr', 'this_or_that', 'ttl', 'tic_tac_toe', etc.
  game_type            text NOT NULL,
  -- 'pending' = invite sent, not yet accepted
  -- 'active'  = both players playing
  -- 'ended'   = finished, declined, or quit by one player
  status               text NOT NULL DEFAULT 'pending',
  inviter_id           uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  invitee_id           uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  -- Whatever the game needs: rounds, scores, turn, board, etc.
  state                jsonb NOT NULL DEFAULT '{}'::jsonb,
  ended_by_user_id     uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ended_reason         text, -- 'finished' | 'quit' | 'declined' | 'abandoned'
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  ended_at             timestamptz
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_convo
  ON public.game_sessions(conversation_id, status);

CREATE INDEX IF NOT EXISTS idx_game_sessions_active_for_user
  ON public.game_sessions(invitee_id, status)
  WHERE status = 'pending' OR status = 'active';

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Both players see the row.
CREATE POLICY "Players read their game sessions"
  ON public.game_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Inviter can create — must be a participant in the conversation, and
-- the invitee must also be a participant.
CREATE POLICY "Users create game sessions in their conversations"
  ON public.game_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = inviter_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND auth.uid() = ANY(c.participant_ids)
        AND invitee_id = ANY(c.participant_ids)
    )
  );

-- Both players can update during play (turn, state, status, etc.).
CREATE POLICY "Players update their game sessions"
  ON public.game_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Either player can delete once the game has ended (cleanup).
CREATE POLICY "Players delete their ended game sessions"
  ON public.game_sessions FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = inviter_id OR auth.uid() = invitee_id)
    AND status = 'ended'
  );

-- Auto-bump updated_at on every change so we can stale-check abandoned
-- games later via a cron if needed.
DROP TRIGGER IF EXISTS trg_game_sessions_updated_at ON public.game_sessions;
CREATE TRIGGER trg_game_sessions_updated_at
  BEFORE UPDATE ON public.game_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
