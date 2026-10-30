-- ============================================================
-- Push notifications for every user-to-user interaction
-- + profile photo reminder + push announcement stamp
-- ============================================================
-- Run once in the Supabase SQL editor (after supabase-push-notifications.sql).
-- Safe to re-run. Pushes never block or break the action that caused them.
-- Messages, echoes, replies, saves, recommendations, brand deal and collab
-- applications already push; this adds the rest.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_announced_at TIMESTAMPTZ;

-- ---------- helper: push one interaction (skips self-actions) -------------------
CREATE OR REPLACE FUNCTION public.push_interaction(
  p_actor UUID, p_target UUID, p_title TEXT, p_verb TEXT, p_url TEXT, p_tag TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_name TEXT;
BEGIN
  IF p_target IS NULL OR p_actor IS NULL OR p_actor = p_target THEN RETURN; END IF;
  SELECT username INTO v_name FROM public.profiles WHERE user_id = p_actor;
  PERFORM public.send_push(p_target, p_title,
    COALESCE('@' || v_name, 'Someone') || ' ' || p_verb, p_url, p_tag);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.push_interaction(UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ---------- trigger functions ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_push_wave_like() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID;
BEGIN
  SELECT user_id INTO v_owner FROM public.wave_videos WHERE id = NEW.video_id;
  PERFORM public.push_interaction(NEW.user_id, v_owner, 'New like', 'liked your Wave', '/dashboard', 'wave-like');
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_push_moment_like() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID;
BEGIN
  SELECT user_id INTO v_owner FROM public.moments WHERE id = NEW.moment_id;
  PERFORM public.push_interaction(NEW.user_id, v_owner, 'New like', 'liked your Moment', '/moments', 'moment-like');
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_push_endorsement() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me TEXT;
BEGIN
  SELECT username INTO v_me FROM public.profiles WHERE user_id = NEW.endorsed_id;
  PERFORM public.push_interaction(NEW.endorser_id, NEW.endorsed_id, 'New endorsement', 'endorsed you',
    COALESCE('/profile/' || v_me, '/dashboard'), 'endorse');
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_push_positivity() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me TEXT;
BEGIN
  SELECT username INTO v_me FROM public.profiles WHERE user_id = NEW.voted_user_id;
  PERFORM public.push_interaction(NEW.voter_id, NEW.voted_user_id, 'Positivity vote', 'gave you a positivity vote',
    COALESCE('/profile/' || v_me, '/dashboard'), 'positivity');
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_push_rsvp() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_host UUID;
BEGIN
  SELECT host_id INTO v_host FROM public.meetups WHERE id = NEW.meetup_id;
  PERFORM public.push_interaction(NEW.user_id, v_host, 'New RSVP', 'is going to your meetup', '/meetups', 'rsvp');
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_push_business_save() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID;
BEGIN
  SELECT user_id INTO v_owner FROM public.business_profiles WHERE id = NEW.business_id;
  PERFORM public.push_interaction(NEW.user_id, v_owner, 'Business saved', 'saved your business', '/dashboard', 'biz-save');
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_push_prompt_vote() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID;
BEGIN
  SELECT user_id INTO v_owner FROM public.creative_prompt_answers WHERE id = NEW.answer_id;
  PERFORM public.push_interaction(NEW.voter_id, v_owner, 'New vote', 'voted for your answer', '/weekly', 'prompt-vote');
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_push_game_invite() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public.push_interaction(NEW.inviter_id, NEW.invitee_id, 'Game invite', 'invited you to play a game', '/messages', 'game-' || NEW.conversation_id::text);
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_push_project_task() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM public.push_interaction(NEW.created_by, NEW.assigned_to, 'New task', 'assigned you a task', '/messages', 'task-' || NEW.project_id::text);
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_push_project_room() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID;
BEGIN
  FOREACH v IN ARRAY NEW.participant_ids LOOP
    PERFORM public.push_interaction(NEW.created_by, v, 'Project room', 'added you to a project room', '/messages', 'room-' || NEW.id::text);
  END LOOP;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

-- Connection requests (new pending conversation) and approvals.
CREATE OR REPLACE FUNCTION public.trg_push_connection() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID; v_other UUID;
BEGIN
  IF COALESCE(NEW.kind, 'dm') <> 'dm' THEN RETURN NULL; END IF;
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    FOREACH v IN ARRAY NEW.participant_ids LOOP
      IF v <> NEW.initiated_by THEN
        PERFORM public.push_interaction(NEW.initiated_by, v, 'New connection request', 'wants to connect with you', '/messages', 'conn-' || NEW.id::text);
      END IF;
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    FOREACH v IN ARRAY NEW.participant_ids LOOP
      IF v <> NEW.initiated_by THEN v_other := v; END IF;
    END LOOP;
    PERFORM public.push_interaction(v_other, NEW.initiated_by, 'Request accepted', 'accepted your connection request', '/messages', 'conn-' || NEW.id::text);
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

-- ---------- attach triggers (skips any table that does not exist) --------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('wave_likes',            'AFTER INSERT',            'trg_push_wave_like'),
    ('moment_likes',          'AFTER INSERT',            'trg_push_moment_like'),
    ('profile_endorsements',  'AFTER INSERT',            'trg_push_endorsement'),
    ('positivity_votes',      'AFTER INSERT',            'trg_push_positivity'),
    ('meetup_rsvps',          'AFTER INSERT',            'trg_push_rsvp'),
    ('business_saves',        'AFTER INSERT',            'trg_push_business_save'),
    ('creative_prompt_votes', 'AFTER INSERT',            'trg_push_prompt_vote'),
    ('game_sessions',         'AFTER INSERT',            'trg_push_game_invite'),
    ('project_room_tasks',    'AFTER INSERT',            'trg_push_project_task'),
    ('project_rooms',         'AFTER INSERT',            'trg_push_project_room'),
    ('conversations',         'AFTER INSERT OR UPDATE',  'trg_push_connection')
  ) AS t(tbl, timing, fn)
  LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'push_' || r.tbl, r.tbl);
      EXECUTE format('CREATE TRIGGER %I %s ON public.%I FOR EACH ROW EXECUTE FUNCTION public.%I()',
                     'push_' || r.tbl, r.timing, r.tbl, r.fn);
    END IF;
  END LOOP;
END $$;

-- ---------- photo reminder when notifications are turned on --------------------
CREATE OR REPLACE FUNCTION public.trg_push_photo_reminder() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_has BOOLEAN;
BEGIN
  SELECT (COALESCE(btrim(p.avatar_url), '') <> '')
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(
                   CASE WHEN jsonb_typeof(to_jsonb(p.photos)) = 'array' THEN to_jsonb(p.photos) ELSE '[]'::jsonb END) e
                  WHERE COALESCE(btrim(e->>'url'), '') <> '')
    INTO v_has FROM public.profiles p WHERE p.user_id = NEW.user_id;
  IF v_has IS NOT NULL AND NOT v_has THEN
    PERFORM public.send_push(NEW.user_id, 'Add a profile picture',
      'You have not added a profile picture yet.', '/edit-profile', 'photo-reminder');
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_push_photo_reminder ON public.push_subscriptions;
CREATE TRIGGER trg_push_photo_reminder
  AFTER INSERT ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_push_photo_reminder();

-- ---------- Check ------------------------------------------------------------
-- Expect: triggers = 12 (11 interaction + 1 reminder); a lower number just
-- means some optional table is not in your database.
SELECT count(*) AS triggers FROM pg_trigger
 WHERE NOT tgisinternal AND (tgname LIKE 'push\_%' OR tgname = 'trg_push_photo_reminder');
