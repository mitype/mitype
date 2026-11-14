-- ============================================================
-- Top Friends (up to 6 per profile, approval required)
-- ============================================================
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- How it works
--   * A subscriber picks a member and sends a Top Friends request.
--   * The member gets a notification (and a push if enabled) and approves
--     or denies it on /top-friends.
--   * Approved -> shows on the owner's profile. Denied -> the request is
--     removed and the owner gets a "denied" notification. Re-requesting
--     is allowed any time.
--   * The owner can reorder or remove anyone. A listed friend can remove
--     themselves (the owner is told).
--   * Every write goes through the functions below, so the subscriber rule
--     and the 6 spot limit cannot be bypassed from the browser.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.top_friends (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  slot       SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_id, friend_id),
  CHECK (owner_id <> friend_id)
);

-- Deferred so reordering can swap slots inside one statement.
ALTER TABLE public.top_friends DROP CONSTRAINT IF EXISTS top_friends_owner_slot_key;
ALTER TABLE public.top_friends
  ADD CONSTRAINT top_friends_owner_slot_key
  UNIQUE (owner_id, slot) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS top_friends_friend_idx ON public.top_friends (friend_id, status);

ALTER TABLE public.top_friends ENABLE ROW LEVEL SECURITY;

-- Read: approved rows are visible to any signed-in member (they show on the
-- owner's profile). Pending rows are visible only to the two people involved.
DROP POLICY IF EXISTS top_friends_select ON public.top_friends;
CREATE POLICY top_friends_select ON public.top_friends
  FOR SELECT TO authenticated
  USING (status = 'approved' OR owner_id = auth.uid() OR friend_id = auth.uid());

-- No insert/update/delete policies on purpose: writes use the functions below.

-- ---------- helpers ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tf_is_subscriber(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
     WHERE s.user_id = p_user AND s.status IN ('active', 'trialing')
  )
$$;
REVOKE ALL ON FUNCTION public.tf_is_subscriber(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tf_notify(
  p_user UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_url TEXT, p_actor UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, action_url, related_user_id)
  VALUES (p_user, p_type, p_title, p_body, p_url, p_actor);
  BEGIN
    PERFORM public.send_push(p_user, p_title, p_body, p_url, p_type);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- push is best effort and never blocks the action
  END;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
REVOKE ALL ON FUNCTION public.tf_notify(UUID, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tf_username(p_user UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE('@' || username, 'A member') FROM public.profiles WHERE user_id = p_user
$$;
REVOKE ALL ON FUNCTION public.tf_username(UUID) FROM PUBLIC, anon, authenticated;

-- ---------- send a request ---------------------------------------------
CREATE OR REPLACE FUNCTION public.request_top_friend(p_friend UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me   UUID := auth.uid();
  v_slot SMALLINT;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;
  IF NOT public.tf_is_subscriber(v_me) THEN
    RAISE EXCEPTION 'Top Friends is for subscribers.';
  END IF;
  IF p_friend IS NULL OR p_friend = v_me THEN
    RAISE EXCEPTION 'Pick someone else.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_friend) THEN
    RAISE EXCEPTION 'That member has no profile yet.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.top_friends WHERE owner_id = v_me AND friend_id = p_friend) THEN
    RAISE EXCEPTION 'You already added or requested this member.';
  END IF;

  -- Lowest free spot between 1 and 6 (requests held open count as a spot).
  SELECT s INTO v_slot
    FROM generate_series(1, 6) AS s
   WHERE NOT EXISTS (SELECT 1 FROM public.top_friends WHERE owner_id = v_me AND slot = s)
   ORDER BY s LIMIT 1;
  IF v_slot IS NULL THEN
    RAISE EXCEPTION 'Your Top Friends are full (6). Remove one first.';
  END IF;

  INSERT INTO public.top_friends (owner_id, friend_id, status, slot)
  VALUES (v_me, p_friend, 'pending', v_slot);

  PERFORM public.tf_notify(
    p_friend, 'top_friend_request', 'Top Friends request',
    public.tf_username(v_me) || ' wants to add you to their Top Friends. Approve or deny it.',
    '/top-friends', v_me);

  RETURN 'requested';
END $$;
REVOKE ALL ON FUNCTION public.request_top_friend(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_top_friend(UUID) TO authenticated;

-- ---------- approve or deny --------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_top_friend(p_request UUID, p_accept BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me  UUID := auth.uid();
  v_row public.top_friends%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;
  IF NOT public.tf_is_subscriber(v_me) THEN
    RAISE EXCEPTION 'Top Friends is for subscribers.';
  END IF;

  SELECT * INTO v_row FROM public.top_friends
   WHERE id = p_request AND friend_id = v_me AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'That request is no longer there.'; END IF;

  IF p_accept THEN
    UPDATE public.top_friends SET status = 'approved' WHERE id = v_row.id;
    PERFORM public.tf_notify(
      v_row.owner_id, 'top_friend_accepted', 'Top Friends request approved',
      public.tf_username(v_me) || ' approved your Top Friends request. They are now on your profile.',
      '/top-friends', v_me);
    RETURN 'approved';
  END IF;

  DELETE FROM public.top_friends WHERE id = v_row.id;
  PERFORM public.tf_notify(
    v_row.owner_id, 'top_friend_denied', 'Top Friends request denied',
    public.tf_username(v_me) || ' denied your Top Friends request.',
    '/top-friends', v_me);
  RETURN 'denied';
END $$;
REVOKE ALL ON FUNCTION public.respond_top_friend(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_top_friend(UUID, BOOLEAN) TO authenticated;

-- ---------- remove (owner removes anyone, friend removes themselves) ----
CREATE OR REPLACE FUNCTION public.remove_top_friend(p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me  UUID := auth.uid();
  v_row public.top_friends%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;

  SELECT * INTO v_row FROM public.top_friends
   WHERE id = p_id AND (owner_id = v_me OR friend_id = v_me);
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found.'; END IF;

  DELETE FROM public.top_friends WHERE id = v_row.id;

  -- Only tell the owner when an approved friend removes themselves.
  IF v_row.friend_id = v_me AND v_row.status = 'approved' THEN
    PERFORM public.tf_notify(
      v_row.owner_id, 'top_friend_removed', 'Removed from Top Friends',
      public.tf_username(v_me) || ' removed themselves from your Top Friends. A spot is open.',
      '/top-friends', v_me);
  END IF;
  RETURN 'removed';
END $$;
REVOKE ALL ON FUNCTION public.remove_top_friend(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_top_friend(UUID) TO authenticated;

-- ---------- reorder (owner passes all of their row ids in the new order) -
CREATE OR REPLACE FUNCTION public.reorder_top_friends(p_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me UUID := auth.uid();
  v_n  INT;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;
  SELECT count(*) INTO v_n FROM public.top_friends WHERE owner_id = v_me;
  IF v_n <> COALESCE(array_length(p_ids, 1), 0)
     OR EXISTS (SELECT 1 FROM unnest(p_ids) i
                 WHERE NOT EXISTS (SELECT 1 FROM public.top_friends t
                                    WHERE t.id = i AND t.owner_id = v_me)) THEN
    RAISE EXCEPTION 'List changed. Refresh and try again.';
  END IF;

  UPDATE public.top_friends t
     SET slot = o.pos::SMALLINT
    FROM unnest(p_ids) WITH ORDINALITY AS o(id, pos)
   WHERE t.id = o.id AND t.owner_id = v_me;
END $$;
REVOKE ALL ON FUNCTION public.reorder_top_friends(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_top_friends(UUID[]) TO authenticated;

-- ---------- Check ------------------------------------------------------
-- Expect: table = 1, functions = 4, rls = true
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'top_friends') AS "table",
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('request_top_friend','respond_top_friend','remove_top_friend','reorder_top_friends')) AS functions,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.top_friends'::regclass) AS rls;
