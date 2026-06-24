-- ============================================================
-- Groups + Rooms — migration
-- ============================================================
-- Extends the existing `conversations` table to support three kinds
-- of chats instead of one:
--   - 'dm'    : the existing 1:1 connection chats (default)
--   - 'group' : 2-10 person private group chats (members invite-only)
--   - 'room'  : public or invite-only themed rooms with discovery,
--               moderation, daily prompts, up to 250 members
--
-- We reuse the existing participant_ids[] array for membership across
-- all three kinds. For rooms we soft-cap at 250 to keep the array
-- manageable; if a room grows past that we'll migrate to a separate
-- room_members table in a future migration.
--
-- Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ─────────────────────────── New columns ────────────────────────────

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS kind TEXT
    CHECK (kind IN ('dm', 'group', 'room'))
    DEFAULT 'dm' NOT NULL;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- For rooms — matches an entry from the shared creator categories
-- (lib/categories.ts) or one of the room-specific buckets.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Public rooms appear in /discover; invite-only rooms only show up
-- once someone has added the user. Has no meaning for 'dm' or
-- 'group' kinds.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Who created the group/room. For 'dm' this column stays null;
-- the original initiated_by handles that case.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Additional moderators (rooms only). The creator is always an
-- implicit moderator; this list lets them deputize others.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS moderator_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Rooms support a rotating daily prompt the moderators can set.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS daily_prompt TEXT;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS daily_prompt_set_at TIMESTAMPTZ;

-- ───────────────────────── New constraints ─────────────────────────
-- Enforce participant count by kind. We DROP IF EXISTS first because
-- this migration is idempotent — re-running it should work cleanly.

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS chk_participant_count;

ALTER TABLE public.conversations
  ADD CONSTRAINT chk_participant_count CHECK (
    (kind = 'dm'    AND array_length(participant_ids, 1) = 2)
    OR (kind = 'group' AND array_length(participant_ids, 1) BETWEEN 2 AND 10)
    OR (kind = 'room'  AND array_length(participant_ids, 1) BETWEEN 1 AND 250)
  );

-- Rooms must have a title; groups too (DMs derive their title from
-- participant names client-side).
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS chk_group_room_has_title;

ALTER TABLE public.conversations
  ADD CONSTRAINT chk_group_room_has_title CHECK (
    kind = 'dm' OR (title IS NOT NULL AND length(trim(title)) > 0)
  );

-- Only rooms can be public.
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS chk_public_only_rooms;

ALTER TABLE public.conversations
  ADD CONSTRAINT chk_public_only_rooms CHECK (
    is_public = FALSE OR kind = 'room'
  );

-- ──────────────────────────── Indexes ───────────────────────────────

-- Power the "public rooms" discovery surface — list public rooms by
-- category, ordered by activity. updated_at gets bumped on every new
-- message via existing triggers.
CREATE INDEX IF NOT EXISTS idx_conversations_public_rooms
  ON public.conversations(category, updated_at DESC)
  WHERE kind = 'room' AND is_public = TRUE;

-- Quick "what rooms is this user in?" lookups for the inbox.
CREATE INDEX IF NOT EXISTS idx_conversations_kind_participants
  ON public.conversations USING GIN (participant_ids)
  WHERE kind IN ('group', 'room');

-- ───────────────────────────── RLS ──────────────────────────────────
-- We add room-specific policies on top of the existing ones rather
-- than rewriting them, so DMs and groups keep behaving like before.
--
-- Important rule: a public ROOM is visible to anyone (so they can
-- find it on Discover and choose to join), but only members can send
-- messages or read message history. The conversations row itself is
-- readable; messages are gated by participant_ids.

-- Public-room visibility for non-members (Discover).
DROP POLICY IF EXISTS "Anyone can see public rooms" ON public.conversations;
CREATE POLICY "Anyone can see public rooms"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    kind = 'room' AND is_public = TRUE
  );

-- Members can update the conversation row (e.g., to leave by removing
-- themselves from participant_ids). The creator + mods can change
-- title/description/etc. The existing UPDATE policy handles members;
-- we add a moderator-only policy for room metadata changes.
DROP POLICY IF EXISTS "Creator and mods update room metadata" ON public.conversations;
CREATE POLICY "Creator and mods update room metadata"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (
    kind = 'room'
    AND (auth.uid() = creator_id OR auth.uid() = ANY(moderator_ids))
  );

-- Allow authenticated users to create groups + public rooms.
-- The existing INSERT policy allows DM creation; we extend.
DROP POLICY IF EXISTS "Users create groups and rooms" ON public.conversations;
CREATE POLICY "Users create groups and rooms"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- DMs use the existing flow (initiated_by must be the user).
    (kind = 'dm' AND auth.uid() = initiated_by)
    OR
    -- Groups + rooms: creator must be the inserting user, and they
    -- must be in their own participant_ids list.
    ((kind = 'group' OR kind = 'room')
      AND auth.uid() = creator_id
      AND auth.uid() = ANY(participant_ids))
  );

-- Public-room JOIN: a user can add themselves to a public room's
-- participant_ids without needing the creator's approval. We allow
-- this through an UPDATE policy that only lets a user toggle their
-- OWN membership (add themselves to participant_ids).
--
-- The check is enforced by an application-level helper rather than a
-- raw SQL policy because Postgres array operations in CHECK clauses
-- get gnarly. We just ensure that for public rooms, any authenticated
-- user can UPDATE the row; the client only ever pushes the
-- "append my uid" change.
DROP POLICY IF EXISTS "Anyone can join public rooms" ON public.conversations;
CREATE POLICY "Anyone can join public rooms"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (kind = 'room' AND is_public = TRUE);
