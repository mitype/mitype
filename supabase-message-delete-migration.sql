-- ============================================================
-- Message deletion — migration
-- ============================================================
-- Two columns on messages let users delete privately or unsend:
--   - hidden_for_user_ids  : per-user soft hide ("delete for me")
--   - deleted_for_everyone : true when the sender unsent the message
--                            within 1h; renders as "[deleted]" for all
--
-- Deleting a whole conversation is implemented in the app by adding
-- every existing message's hidden_for_user_ids — no extra schema.
--
-- Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS hidden_for_user_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS deleted_for_everyone boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_hidden_for_user_ids
  ON public.messages USING gin (hidden_for_user_ids);
