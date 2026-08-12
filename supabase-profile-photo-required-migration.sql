-- ============================================================
-- One-time notification blast: profile photo required
-- ============================================================
-- Sends a single in-app notification to every existing user who has
-- no profile photo, telling them their profile is incomplete because
-- they haven't uploaded one yet. Uses the existing `notifications`
-- table so the notification appears in the bell menu next time each
-- user opens the app.
--
-- Photo detection matches the client-side logic in
-- app/lib/profileCompleteness.ts:
--   * user has a photo if avatar_url is non-empty, OR
--   * the `photos` JSON array contains at least one entry with a url
--
-- Idempotent — safe to re-run. The WHERE clause on the INSERT excludes
-- anyone who already has a matching photo-required notification so
-- users aren't spammed on a second run.
-- ============================================================

INSERT INTO public.notifications (
  user_id,
  type,
  title,
  body,
  action_url,
  is_read,
  created_at
)
SELECT
  p.user_id,
  'profile_photo_required',
  'Your profile is incomplete',
  'You haven''t uploaded a profile photo yet. Add one now to finish setting up your profile.',
  '/edit-profile',
  FALSE,
  NOW()
FROM public.profiles p
WHERE
  -- No avatar mirror set
  (p.avatar_url IS NULL OR btrim(p.avatar_url) = '')
  AND
  -- No entry in the multi-photo array with a non-empty url
  (
    p.photos IS NULL
    OR jsonb_typeof(p.photos) <> 'array'
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p.photos) AS elem
      WHERE btrim(COALESCE(elem->>'url', '')) <> ''
    )
  )
  AND
  -- Skip anyone we've already notified about this
  NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = p.user_id
      AND n.type = 'profile_photo_required'
  );
