-- Unread message counts, computed inside the database.
-- Replaces downloading every unread message row just to count them.
-- Safe to run more than once. Uses SECURITY INVOKER, so the same Row Level
-- Security rules as a normal query apply: a member only ever counts
-- messages in conversations they can already see.
--
-- The app works with or without this function (it falls back to the old
-- query if the function is missing), so running this is purely a speed-up.

CREATE OR REPLACE FUNCTION public.get_unread_counts()
RETURNS TABLE (conversation_id UUID, unread_count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT m.conversation_id, COUNT(*)::BIGINT AS unread_count
  FROM public.messages m
  WHERE m.sender_id <> auth.uid()
    AND m.read_at IS NULL
  GROUP BY m.conversation_id
$$;

REVOKE ALL ON FUNCTION public.get_unread_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_counts() TO authenticated;

-- Small partial index: only unread rows are indexed, so it stays tiny.
CREATE INDEX IF NOT EXISTS messages_unread_idx
  ON public.messages (conversation_id)
  WHERE read_at IS NULL;

-- Check: should list the function (run while signed in via the app, or
-- just confirm it exists here).
SELECT proname FROM pg_proc WHERE proname = 'get_unread_counts';
