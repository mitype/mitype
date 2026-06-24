-- ============================================================
-- Room moderation — small migration
-- ============================================================
-- Adds `pinned_message_id` to conversations. A moderator (the creator
-- or anyone in moderator_ids) can pin ONE message at a time which
-- renders as a sticky banner at the top of the chat thread.
--
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS pinned_message_id UUID
    REFERENCES public.messages(id) ON DELETE SET NULL;
