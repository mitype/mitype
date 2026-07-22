-- ============================================================
-- Cancel pending message request — migration
-- ============================================================
-- Lets the sender withdraw a conversation request they initiated but
-- that the recipient hasn't approved yet. Without this policy, the
-- initiator has no way to remove their own pending request — it just
-- sits in "Sent" forever.
--
-- Policy shape: DELETE on `conversations` is allowed ONLY when
--   * the current user is the initiator (initiated_by = auth.uid()), AND
--   * the conversation status is still 'pending' (never approved).
--
-- Messages inside the conversation cascade-delete via the FK on
-- `messages.conversation_id ON DELETE CASCADE`, so removing the
-- conversation cleans up its messages automatically.
--
-- Safe to re-run.
-- ============================================================

DROP POLICY IF EXISTS "Initiator can cancel pending request" ON public.conversations;
CREATE POLICY "Initiator can cancel pending request"
  ON public.conversations
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = initiated_by
    AND status = 'pending'
  );
