-- ============================================================
-- Conversation hide-from-inbox migration
-- ============================================================
-- When a user deletes a conversation from their Messages inbox, the
-- OTHER person's avatar/row was still lingering because we only
-- soft-hid the individual messages, not the conversation itself.
--
-- This migration:
--   1. Adds `hidden_for_user_ids` to `conversations` — same shape as
--      the column on `messages`. If your uuid is in this array, the
--      conversation disappears from your inbox list.
--   2. Adds a trigger so that when the OTHER person sends a NEW
--      message, your uuid is automatically removed from
--      `conversations.hidden_for_user_ids`. This means:
--        - You wipe the convo → it disappears completely.
--        - The other person is silent → it stays gone forever.
--        - The other person sends anything new → it reappears in
--          your inbox (as it should — that's a fresh message you
--          need to see).
--   3. Sets up an index for fast "not-hidden" filtering.
--
-- Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS hidden_for_user_ids uuid[] DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_conversations_hidden_for_user_ids
  ON public.conversations USING gin (hidden_for_user_ids);

-- ---------- unhide-on-new-message trigger --------------------------------
-- On any new incoming message, clear `hidden_for_user_ids` on the
-- parent conversation. This means:
--   * Anyone who deleted the convo from their inbox will see it
--     reappear the moment a new message arrives.
--   * Users who never hid the convo are unaffected (the array is
--     already empty for them, so clearing is a no-op).
--
-- Chose "clear all" over "clear all except sender" for simplicity: if
-- you're sending a message, you clearly want the convo visible in your
-- own inbox too, so removing yourself from the hidden array is fine.
CREATE OR REPLACE FUNCTION public.unhide_conversation_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
     SET hidden_for_user_ids = '{}'::uuid[]
   WHERE id = NEW.conversation_id
     AND array_length(hidden_for_user_ids, 1) IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unhide_conversation_on_new_message ON public.messages;
CREATE TRIGGER trg_unhide_conversation_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.unhide_conversation_on_new_message();

-- Grant needed so the trigger can execute for authenticated inserts.
GRANT EXECUTE ON FUNCTION public.unhide_conversation_on_new_message() TO authenticated;
