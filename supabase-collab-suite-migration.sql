-- ============================================================
-- Collaboration Suite: five new features in one migration
--   1. Collab Board — creator-to-creator project briefs
--   2. Local Meetups — in-person creator events
--   3. Availability Signal — profile toggles
--   4. Project Rooms — shared workspaces
--   5. Skill Tags — deep filter tags on profiles
-- ============================================================

-- =========================================================================
-- 1. COLLAB BOARD
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.collab_briefs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by             uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title                 text NOT NULL,
  description           text NOT NULL,
  looking_for_category  text,
  compensation_type     text NOT NULL DEFAULT 'trade',  -- 'paid' | 'trade' | 'revenue_share' | 'credit'
  compensation_details  text,
  timeline              text,
  location_type         text NOT NULL DEFAULT 'remote', -- 'remote' | 'local' | 'either'
  city                  text,
  state                 text,
  status                text NOT NULL DEFAULT 'open',   -- 'open' | 'closed' | 'filled'
  applications_count    integer NOT NULL DEFAULT 0,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  CHECK (char_length(title) BETWEEN 3 AND 120),
  CHECK (char_length(description) BETWEEN 20 AND 4000),
  CHECK (compensation_type IN ('paid','trade','revenue_share','credit')),
  CHECK (location_type IN ('remote','local','either')),
  CHECK (status IN ('open','closed','filled'))
);
CREATE INDEX IF NOT EXISTS idx_collab_briefs_open ON public.collab_briefs(status, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_collab_briefs_poster ON public.collab_briefs(posted_by, created_at DESC);
ALTER TABLE public.collab_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read open collab briefs" ON public.collab_briefs;
CREATE POLICY "Members read open collab briefs" ON public.collab_briefs FOR SELECT TO authenticated
  USING (status = 'open' OR posted_by = auth.uid());

DROP POLICY IF EXISTS "Subscribed creator posts a collab brief" ON public.collab_briefs;
CREATE POLICY "Subscribed creator posts a collab brief" ON public.collab_briefs FOR INSERT TO authenticated
  WITH CHECK (posted_by = auth.uid() AND public.is_subscribed(auth.uid()));

DROP POLICY IF EXISTS "Owner updates own collab brief" ON public.collab_briefs;
CREATE POLICY "Owner updates own collab brief" ON public.collab_briefs FOR UPDATE TO authenticated
  USING (posted_by = auth.uid()) WITH CHECK (posted_by = auth.uid());

DROP POLICY IF EXISTS "Owner deletes own collab brief" ON public.collab_briefs;
CREATE POLICY "Owner deletes own collab brief" ON public.collab_briefs FOR DELETE TO authenticated
  USING (posted_by = auth.uid() AND applications_count = 0);

CREATE TABLE IF NOT EXISTS public.collab_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id            uuid NOT NULL REFERENCES public.collab_briefs(id) ON DELETE CASCADE,
  applicant_id        uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  intro_message       text NOT NULL,
  status              text NOT NULL DEFAULT 'submitted',
  created_at          timestamptz DEFAULT now(),
  UNIQUE(brief_id, applicant_id),
  CHECK (char_length(intro_message) BETWEEN 20 AND 2000),
  CHECK (status IN ('submitted','shortlisted','accepted','declined','withdrawn'))
);
CREATE INDEX IF NOT EXISTS idx_collab_apps_brief ON public.collab_applications(brief_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collab_apps_applicant ON public.collab_applications(applicant_id, created_at DESC);
ALTER TABLE public.collab_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicant + owner read collab apps" ON public.collab_applications;
CREATE POLICY "Applicant + owner read collab apps" ON public.collab_applications FOR SELECT TO authenticated
  USING (applicant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.collab_briefs b WHERE b.id = brief_id AND b.posted_by = auth.uid()));

DROP POLICY IF EXISTS "Subscribed applies to collab" ON public.collab_applications;
CREATE POLICY "Subscribed applies to collab" ON public.collab_applications FOR INSERT TO authenticated
  WITH CHECK (
    applicant_id = auth.uid() AND public.is_subscribed(auth.uid())
    AND EXISTS (SELECT 1 FROM public.collab_briefs b WHERE b.id = brief_id AND b.status = 'open' AND b.posted_by <> auth.uid())
  );

DROP POLICY IF EXISTS "Applicant or owner updates collab app" ON public.collab_applications;
CREATE POLICY "Applicant or owner updates collab app" ON public.collab_applications FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.collab_briefs b WHERE b.id = brief_id AND b.posted_by = auth.uid()));

CREATE OR REPLACE FUNCTION public.bump_collab_apps_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP='INSERT') THEN
    UPDATE public.collab_briefs SET applications_count = applications_count + 1, updated_at = NOW() WHERE id = NEW.brief_id;
    RETURN NEW;
  ELSIF (TG_OP='DELETE') THEN
    UPDATE public.collab_briefs SET applications_count = GREATEST(applications_count - 1, 0), updated_at = NOW() WHERE id = OLD.brief_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_collab_apps_count ON public.collab_applications;
CREATE TRIGGER trg_collab_apps_count AFTER INSERT OR DELETE ON public.collab_applications
  FOR EACH ROW EXECUTE FUNCTION public.bump_collab_apps_count();
GRANT EXECUTE ON FUNCTION public.bump_collab_apps_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_new_collab_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE brief_owner UUID; brief_title TEXT; applicant_username TEXT;
BEGIN
  SELECT posted_by, title INTO brief_owner, brief_title FROM public.collab_briefs WHERE id = NEW.brief_id;
  SELECT username INTO applicant_username FROM public.profiles WHERE user_id = NEW.applicant_id;
  IF brief_owner IS NULL OR brief_owner = NEW.applicant_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, action_url, related_user_id, is_read, created_at)
  VALUES (brief_owner, 'collab_new_application', 'New collab application',
    '@' || COALESCE(applicant_username,'someone') || ' applied to "' || COALESCE(brief_title,'your collab brief') || '"',
    '/collab/' || NEW.brief_id, NEW.applicant_id, FALSE, NOW());
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_on_new_collab_application ON public.collab_applications;
CREATE TRIGGER trg_notify_on_new_collab_application AFTER INSERT ON public.collab_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_collab_application();
GRANT EXECUTE ON FUNCTION public.notify_on_new_collab_application() TO authenticated;

-- =========================================================================
-- 2. LOCAL MEETUPS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.meetups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text NOT NULL,
  meetup_time   timestamptz NOT NULL,
  venue_name    text,
  address       text,
  city          text,
  state         text,
  zip_code      text,
  capacity      integer,
  rsvp_count    integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'open',
  created_at    timestamptz DEFAULT now(),
  CHECK (char_length(title) BETWEEN 3 AND 120),
  CHECK (char_length(description) BETWEEN 10 AND 2000),
  CHECK (status IN ('open','canceled','ended'))
);
CREATE INDEX IF NOT EXISTS idx_meetups_upcoming ON public.meetups(status, meetup_time)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_meetups_zip ON public.meetups(zip_code, meetup_time)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_meetups_host ON public.meetups(host_id, created_at DESC);
ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read meetups" ON public.meetups;
CREATE POLICY "Members read meetups" ON public.meetups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Subscribed creates meetup" ON public.meetups;
CREATE POLICY "Subscribed creates meetup" ON public.meetups FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() AND public.is_subscribed(auth.uid()));

DROP POLICY IF EXISTS "Host updates own meetup" ON public.meetups;
CREATE POLICY "Host updates own meetup" ON public.meetups FOR UPDATE TO authenticated
  USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "Host deletes own meetup" ON public.meetups;
CREATE POLICY "Host deletes own meetup" ON public.meetups FOR DELETE TO authenticated
  USING (host_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.meetup_rsvps (
  meetup_id   uuid NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (meetup_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_meetup_rsvps_user ON public.meetup_rsvps(user_id, created_at DESC);
ALTER TABLE public.meetup_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read rsvps" ON public.meetup_rsvps;
CREATE POLICY "Members read rsvps" ON public.meetup_rsvps FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Subscribed rsvps" ON public.meetup_rsvps;
CREATE POLICY "Subscribed rsvps" ON public.meetup_rsvps FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_subscribed(auth.uid()));

DROP POLICY IF EXISTS "User cancels own rsvp" ON public.meetup_rsvps;
CREATE POLICY "User cancels own rsvp" ON public.meetup_rsvps FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_meetup_rsvp_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP='INSERT') THEN
    UPDATE public.meetups SET rsvp_count = rsvp_count + 1 WHERE id = NEW.meetup_id;
    RETURN NEW;
  ELSIF (TG_OP='DELETE') THEN
    UPDATE public.meetups SET rsvp_count = GREATEST(rsvp_count - 1, 0) WHERE id = OLD.meetup_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_meetup_rsvp_count ON public.meetup_rsvps;
CREATE TRIGGER trg_meetup_rsvp_count AFTER INSERT OR DELETE ON public.meetup_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.bump_meetup_rsvp_count();
GRANT EXECUTE ON FUNCTION public.bump_meetup_rsvp_count() TO authenticated;

-- =========================================================================
-- 3. AVAILABILITY SIGNAL + 5. SKILL TAGS
-- =========================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS available_for_work   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS available_for_coffee BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS skill_tags           TEXT[]  NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_profiles_available_work   ON public.profiles(available_for_work)   WHERE available_for_work   = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_available_coffee ON public.profiles(available_for_coffee) WHERE available_for_coffee = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_skill_tags       ON public.profiles USING gin (skill_tags);

-- =========================================================================
-- 4. PROJECT ROOMS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.project_rooms (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by       uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  participant_ids  uuid[] NOT NULL,
  deadline         timestamptz,
  status           text NOT NULL DEFAULT 'active',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CHECK (char_length(title) BETWEEN 3 AND 120),
  CHECK (status IN ('active','completed','archived'))
);
CREATE INDEX IF NOT EXISTS idx_project_rooms_participants ON public.project_rooms USING gin (participant_ids);
CREATE INDEX IF NOT EXISTS idx_project_rooms_status ON public.project_rooms(status, updated_at DESC);
ALTER TABLE public.project_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read project rooms" ON public.project_rooms;
CREATE POLICY "Participants read project rooms" ON public.project_rooms FOR SELECT TO authenticated
  USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Subscribed creates project room" ON public.project_rooms;
CREATE POLICY "Subscribed creates project room" ON public.project_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_subscribed(auth.uid()) AND auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "Participants update project rooms" ON public.project_rooms;
CREATE POLICY "Participants update project rooms" ON public.project_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = ANY(participant_ids)) WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE TABLE IF NOT EXISTS public.project_room_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.project_rooms(id) ON DELETE CASCADE,
  title        text NOT NULL,
  done         boolean NOT NULL DEFAULT false,
  assigned_to  uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_by   uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  CHECK (char_length(title) BETWEEN 1 AND 200)
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_room_tasks(project_id, created_at);
ALTER TABLE public.project_room_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read tasks" ON public.project_room_tasks;
CREATE POLICY "Participants read tasks" ON public.project_room_tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_rooms p WHERE p.id = project_id AND auth.uid() = ANY(p.participant_ids)));

DROP POLICY IF EXISTS "Participants create tasks" ON public.project_room_tasks;
CREATE POLICY "Participants create tasks" ON public.project_room_tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.project_rooms p WHERE p.id = project_id AND auth.uid() = ANY(p.participant_ids)));

DROP POLICY IF EXISTS "Participants update tasks" ON public.project_room_tasks;
CREATE POLICY "Participants update tasks" ON public.project_room_tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_rooms p WHERE p.id = project_id AND auth.uid() = ANY(p.participant_ids)));

DROP POLICY IF EXISTS "Participants delete tasks" ON public.project_room_tasks;
CREATE POLICY "Participants delete tasks" ON public.project_room_tasks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_rooms p WHERE p.id = project_id AND auth.uid() = ANY(p.participant_ids)));

-- =========================================================================
-- ANNOUNCEMENT BLAST
-- =========================================================================
INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'collab_suite_announce',
  '5 new features on Mitype',
  'Collab Board (post creative briefs to other creators), Local Meetups (meet other creators in person), Availability toggles (show when you are open to work or a coffee chat), Project Rooms (shared workspaces for teaming up), and Skill Tags (deep filter creators by the tools they actually use). Tap to explore.',
  '/dashboard',
  FALSE,
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = p.user_id AND n.type = 'collab_suite_announce'
);
