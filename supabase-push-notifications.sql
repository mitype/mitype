-- ============================================================
-- Phone (web push) notifications
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- BEFORE RUNNING: replace REPLACE_WITH_PUSH_SECRET below with the same
-- secret you put in Vercel as PUSH_SEND_SECRET. (Do not commit the real
-- value to GitHub.)
--
-- What it does:
--   1. push_subscriptions: one row per phone a member turned
--      notifications on for. Members can only see and manage their own.
--   2. push_config: holds the send address and secret. Nobody signed in
--      can read it.
--   3. A trigger on notifications: when someone else interacts with a
--      member (echo, reply, save, recommendation, brand deal or collab
--      application), the member's phone gets a push.
--   4. A trigger on messages: new direct and group messages push to the
--      other people in the conversation (the text of the message is never
--      sent to the push service, only "New message from @name").
--   Pushes never block or break the action that caused them.
--
-- To add another notification type to the phone list later, add its name
-- to the array in notify_push_on_notification().
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------- 1. phones ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_subs_select ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subs_insert ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subs_update ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subs_delete ON public.push_subscriptions;
CREATE POLICY push_subs_select ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY push_subs_insert ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subs_update ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subs_delete ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------- 2. private settings -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;  -- no policies: closed to everyone but the server

INSERT INTO public.push_config (key, value) VALUES
  ('send_url',    'https://www.mitypeapp.com/api/push/send'),
  ('send_secret', 'REPLACE_WITH_PUSH_SECRET')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ---------- helper: send one push ----------------------------------------------
CREATE OR REPLACE FUNCTION public.send_push(p_user UUID, p_title TEXT, p_body TEXT, p_url TEXT, p_tag TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT;
  v_secret TEXT;
BEGIN
  -- Skip the web call entirely when this person has no phones registered.
  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE user_id = p_user) THEN
    RETURN;
  END IF;
  SELECT value INTO v_url    FROM public.push_config WHERE key = 'send_url';
  SELECT value INTO v_secret FROM public.push_config WHERE key = 'send_secret';
  IF v_url IS NULL OR v_secret IS NULL OR v_secret LIKE 'REPLACE_WITH%' THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body    := jsonb_build_object('user_id', p_user, 'title', p_title, 'body', p_body, 'url', p_url, 'tag', p_tag)
  );
EXCEPTION WHEN OTHERS THEN
  NULL;  -- a failed push must never break the action that caused it
END;
$$;

-- Only the database itself may send pushes. Nobody signed in can call this.
REVOKE ALL ON FUNCTION public.send_push(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ---------- 3. interaction notifications ---------------------------------------
CREATE OR REPLACE FUNCTION public.notify_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = ANY (ARRAY[
    'current_echo', 'current_reply', 'home_goods_save', 'business_recommended',
    'brand_deal_new_application', 'collab_new_application'
  ]) THEN
    PERFORM public.send_push(NEW.user_id, NEW.title, COALESCE(NEW.body, ''), COALESCE(NEW.action_url, '/dashboard'), NEW.type);
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_push_on_notification ON public.notifications;
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_notification();

-- ---------- 4. messages ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_push_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind TEXT;
  v_people UUID[];
  v_name TEXT;
  v_to UUID;
BEGIN
  SELECT kind, participant_ids INTO v_kind, v_people
    FROM public.conversations WHERE id = NEW.conversation_id;
  -- Public rooms can have hundreds of members, so they do not push.
  IF v_people IS NULL OR COALESCE(v_kind, 'dm') = 'room' THEN
    RETURN NULL;
  END IF;
  SELECT username INTO v_name FROM public.profiles WHERE user_id = NEW.sender_id;
  FOREACH v_to IN ARRAY v_people LOOP
    IF v_to <> NEW.sender_id THEN
      PERFORM public.send_push(
        v_to,
        'New message',
        COALESCE('@' || v_name, 'Someone') || ' sent you a message',
        '/messages',
        'msg-' || NEW.conversation_id::text
      );
    END IF;
  END LOOP;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_push_on_message ON public.messages;
CREATE TRIGGER trg_push_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_message();

-- ---------- Check ------------------------------------------------------------
-- Expect: tables = 2, triggers = 2, secret_set = true.
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('push_subscriptions','push_config')) AS tables,
  (SELECT count(*) FROM pg_trigger
    WHERE tgname IN ('trg_push_on_notification','trg_push_on_message') AND NOT tgisinternal) AS triggers,
  (SELECT value NOT LIKE 'REPLACE_WITH%' FROM public.push_config WHERE key = 'send_secret') AS secret_set;
