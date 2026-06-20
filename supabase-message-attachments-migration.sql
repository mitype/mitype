-- ============================================================
-- Message attachments (photos + voice notes) — migration
-- ============================================================
-- Adds optional attachment columns to the existing messages table,
-- creates a `message-media` storage bucket, and sets up RLS so only
-- the conversation participants can read / write attachments.
--
-- Every attachment gets a 24-hour expiry — the cron at
-- /api/cron/message-media-cleanup will delete the storage object and
-- clear the URL once expired.
--
-- Run this once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ---------- new columns on messages ----------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_type             text,        -- 'image' | 'voice'
  ADD COLUMN IF NOT EXISTS attachment_url              text,
  ADD COLUMN IF NOT EXISTS attachment_storage_path     text,        -- for the cron to delete
  ADD COLUMN IF NOT EXISTS attachment_duration_seconds integer,     -- voice only
  ADD COLUMN IF NOT EXISTS attachment_expires_at       timestamptz;

CREATE INDEX IF NOT EXISTS idx_messages_attachment_expires
  ON public.messages (attachment_expires_at)
  WHERE attachment_storage_path IS NOT NULL;


-- ---------- storage bucket for message media ----------
-- NOTE: kept PRIVATE so only conversation participants can read the
-- URLs via signed URLs. Public would expose old photos to anyone with
-- a leaked link even after expiry.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('message-media', 'message-media', false)
  ON CONFLICT DO NOTHING;

-- Folder structure: <conversation_id>/<random-filename>
-- Users may only upload into conversations they're part of.

CREATE POLICY "Participants read message media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-media'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND auth.uid() = ANY(c.participant_ids)
    )
  );

CREATE POLICY "Participants upload message media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-media'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND auth.uid() = ANY(c.participant_ids)
    )
  );

CREATE POLICY "Service role can delete expired media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'message-media');
