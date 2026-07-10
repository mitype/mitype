-- Universal upload compatibility migration.
--
-- Ensures every user-facing storage bucket accepts any format the
-- user's phone / camera / export tool can produce, with generous size
-- limits, so nobody ever gets a 400 from a MIME whitelist mismatch or
-- a bucket that doesn't exist.
--
-- Buckets covered (creates them if missing; updates limits if present):
--   avatars              — profile photos, public
--   pet-photos           — Mipets, public
--   business-logos       — small business logos, public
--   business-photos      — legacy alias, harmless if unused
--   home-goods-photos    — Mi Home Goods listings, public
--   profile-photos       — legacy alias, harmless if unused
--   message-media        — DM attachments (image + audio), PRIVATE
--   wave-videos          — Wave feed videos, PRIVATE (signed URLs)
--
-- Policy:
--   allowed_mime_types = NULL          → accept anything
--   file_size_limit    = generous per bucket type
--
-- The prior security migration whitelisted specific MIME strings, which
-- broke uploads whenever a browser appended codec params, sent an
-- empty type, or reported application/octet-stream for a valid file.
-- This migration removes those whitelists site-wide. Bucket
-- private/public flag stays as-is; we only touch size + MIME columns.
--
-- Safe to re-run.

-- Create buckets that may not exist yet. UPSERT-style so this is idempotent.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars',           'avatars',           TRUE),
  ('pet-photos',        'pet-photos',        TRUE),
  ('business-logos',    'business-logos',    TRUE),
  ('business-photos',   'business-photos',   TRUE),
  ('home-goods-photos', 'home-goods-photos', TRUE),
  ('profile-photos',    'profile-photos',    TRUE),
  ('message-media',     'message-media',     FALSE),
  ('wave-videos',       'wave-videos',       FALSE)
ON CONFLICT (id) DO NOTHING;

-- Photo buckets — accept anything, 50 MB cap (comfortably above iPhone
-- HEIC 4K photos, Android 108MP shots, etc).
UPDATE storage.buckets
   SET allowed_mime_types = NULL,
       file_size_limit    = 52428800  -- 50 MB
 WHERE id IN (
   'avatars', 'pet-photos', 'business-logos', 'business-photos',
   'home-goods-photos', 'profile-photos'
 );

-- Message media — image + audio + video, 50 MB cap so short video
-- clips sent as attachments upload cleanly.
UPDATE storage.buckets
   SET allowed_mime_types = NULL,
       file_size_limit    = 52428800  -- 50 MB
 WHERE id = 'message-media';

-- Wave videos — 500 MB cap, matches client-side cap in wave/create.
UPDATE storage.buckets
   SET allowed_mime_types = NULL,
       file_size_limit    = 524288000  -- 500 MB
 WHERE id = 'wave-videos';
