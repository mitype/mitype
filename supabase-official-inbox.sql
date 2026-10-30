-- ============================================================
-- Official @mitype: no approval needed, always in the message center
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Requires the official @mitype profile to exist (it is created the first
-- time you open it from the burger menu or Admin page).
--
-- 1. Any conversation that includes @mitype is approved automatically.
-- 2. Every existing member gets an approved conversation with @mitype
--    waiting in their message center (no message is sent, so nobody gets
--    a push).
-- 3. Every new profile gets the same conversation automatically.
-- ============================================================

CREATE OR REPLACE FUNCTION public.official_user_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.profiles WHERE username = 'mitype' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.official_user_id() FROM PUBLIC, anon, authenticated;

-- 1. auto-approve
CREATE OR REPLACE FUNCTION public.official_auto_approve() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_off UUID := public.official_user_id();
BEGIN
  IF v_off IS NOT NULL AND v_off = ANY (NEW.participant_ids)
     AND COALESCE(NEW.kind, 'dm') = 'dm' THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_official_auto_approve ON public.conversations;
CREATE TRIGGER trg_official_auto_approve
  BEFORE INSERT OR UPDATE OF status ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.official_auto_approve();

-- 2. existing members: approve any old request, then create missing inboxes
UPDATE public.conversations c SET status = 'approved'
 WHERE public.official_user_id() = ANY (c.participant_ids)
   AND COALESCE(c.kind, 'dm') = 'dm' AND c.status <> 'approved';

INSERT INTO public.conversations (participant_ids, status, initiated_by)
SELECT ARRAY[public.official_user_id(), p.user_id], 'approved', public.official_user_id()
  FROM public.profiles p
 WHERE public.official_user_id() IS NOT NULL
   AND p.user_id <> public.official_user_id()
   AND NOT EXISTS (
     SELECT 1 FROM public.conversations c
      WHERE c.participant_ids @> ARRAY[public.official_user_id(), p.user_id]
        AND COALESCE(c.kind, 'dm') = 'dm' AND cardinality(c.participant_ids) = 2);

-- 3. new members
CREATE OR REPLACE FUNCTION public.official_inbox_for_new_profile() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_off UUID := public.official_user_id();
BEGIN
  IF v_off IS NOT NULL AND NEW.user_id <> v_off THEN
    INSERT INTO public.conversations (participant_ids, status, initiated_by)
    VALUES (ARRAY[v_off, NEW.user_id], 'approved', v_off);
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_official_inbox_new_profile ON public.profiles;
CREATE TRIGGER trg_official_inbox_new_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.official_inbox_for_new_profile();

-- Check: official_found should be true; missing_inbox should be 0.
SELECT
  (public.official_user_id() IS NOT NULL) AS official_found,
  (SELECT count(*) FROM public.profiles p
    WHERE p.user_id <> COALESCE(public.official_user_id(), p.user_id)
      AND NOT EXISTS (SELECT 1 FROM public.conversations c
        WHERE c.participant_ids @> ARRAY[public.official_user_id(), p.user_id])) AS missing_inbox;
