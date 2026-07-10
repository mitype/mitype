-- Wave upload: universal-acceptance mode.
--
-- Goal: any phone (iPhone, Android, any model, any OS version) can
-- upload any video format they can record — .mp4, .mov, .webm, .mkv,
-- .3gp, HEVC/H.264/H.265, screen recordings, exported files, etc.
--
-- Two changes:
--   1. `allowed_mime_types = NULL` disables the MIME whitelist on the
--      `wave-videos` bucket. NULL means "accept anything." The client
--      still gates by file extension + video-tag probe before upload,
--      so junk files can't sneak in, but real videos never get
--      rejected by a whitelist mismatch again.
--   2. `file_size_limit = 524288000` raises the per-file cap to 500 MB,
--      matching the client-side limit. High-quality 60-second phone
--      clips can approach this on 4K devices.
--
-- Safe to re-run.

UPDATE storage.buckets
   SET allowed_mime_types = NULL,
       file_size_limit    = 524288000  -- 500 MB
 WHERE id = 'wave-videos';
