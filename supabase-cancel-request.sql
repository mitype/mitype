-- ============================================================
-- Request subscription cancellation
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- A subscriber taps "Request subscription cancellation" on /subscription.
-- That sends @mitype two things:
--   1. a bell notification: "@username has submitted a request to cancel"
--   2. a message from the member in their @mitype conversation, so it shows
--      up in the official profile's Messages inbox
-- You then cancel it in PayPal yourself. Nothing is cancelled automatically.
-- One request per member per 24 hours (stops repeat taps).
-- Requires the official @mitype profile and supabase-top-friends.sql
-- (it provides tf_notify and tf_username).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cancellation_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cancellation_requests_user_idx
  ON public.cancellation_requests (user_id, created_at DESC);

ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cancellation_requests_select ON public.cancellation_requests;
CREATE POLICY cancellation_requests_select ON public.cancellation_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- No insert policy on purpose: writes go through the function below.

CREATE OR REPLACE FUNCTION public.request_subscription_cancellation()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me    UUID := auth.uid();
  v_off   UUID := public.official_user_id();
  v_name  TEXT;
  v_text  TEXT;
  v_conv  UUID;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;
  IF v_off IS NULL THEN RAISE EXCEPTION 'Could not send the request right now.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions s
                  WHERE s.user_id = v_me AND s.status IN ('active', 'trialing')) THEN
    RAISE EXCEPTION 'You do not have an active subscription.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cancellation_requests
              WHERE user_id = v_me AND created_at > NOW() - INTERVAL '24 hours') THEN
    RETURN 'already';
  END IF;

  v_name := public.tf_username(v_me);
  v_text := v_name || ' has submitted a request to cancel their subscription.';

  INSERT INTO public.cancellation_requests (user_id) VALUES (v_me);

  -- 1. bell notification for @mitype
  PERFORM public.tf_notify(v_off, 'cancel_request',
    'Cancellation request', v_text, '/messages', v_me);

  -- 2. message in the member's @mitype conversation
  BEGIN
    SELECT c.id INTO v_conv FROM public.conversations c
     WHERE c.participant_ids @> ARRAY[v_off, v_me]
       AND COALESCE(c.kind, 'dm') = 'dm' AND cardinality(c.participant_ids) = 2
     LIMIT 1;
    IF v_conv IS NULL THEN
      INSERT INTO public.conversations (participant_ids, status, initiated_by)
      VALUES (ARRAY[v_off, v_me], 'approved', v_me)
      RETURNING id INTO v_conv;
    END IF;
    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (v_conv, v_me, v_text);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- the bell notification above already went through
  END;

  RETURN 'sent';
END $$;
REVOKE ALL ON FUNCTION public.request_subscription_cancellation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_subscription_cancellation() TO authenticated;

-- Check: expect fn = 1, official_found = true.
SELECT
  (SELECT count(*) FROM pg_proc WHERE proname = 'request_subscription_cancellation') AS fn,
  (public.official_user_id() IS NOT NULL) AS official_found;
