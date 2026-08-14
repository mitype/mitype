-- ============================================================
-- Brand Deals Marketplace
-- ============================================================
-- Lets subscribed small businesses post paid creator briefs;
-- subscribed creators can browse and apply. Applications open a
-- message thread using the existing conversations table so
-- negotiation stays inside the messages inbox.
--
-- Two new tables:
--   1. `brand_deals` — the brief itself (posted by a business owner)
--   2. `brand_deal_applications` — a creator's application to a brief
--
-- Subscription gating enforced at the RLS layer via a helper function
-- `is_subscribed(uid)` that reads subscriptions.status IN
-- ('active','trialing').
--
-- Safe to re-run.
-- ============================================================

-- ---------- helper: is_subscribed ---------------------------------------
CREATE OR REPLACE FUNCTION public.is_subscribed(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = uid
      AND s.status IN ('active', 'trialing')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_subscribed(UUID) TO authenticated;

-- ---------- brand_deals -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_deals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  posted_by        uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  title            text NOT NULL,
  description      text NOT NULL,
  creator_category text,                            -- e.g. 'Photographers', 'Videographers'
  deliverables     text[] NOT NULL DEFAULT '{}',    -- e.g. {'Instagram post','TikTok video'}

  budget_min_cents integer,                         -- null = negotiable
  budget_max_cents integer,

  location_type    text NOT NULL DEFAULT 'remote',  -- 'remote' | 'local' | 'either'
  city             text,
  state            text,
  zip_code         text,

  timeline         text,                            -- freeform "2 weeks", "by Aug 20", etc.
  application_deadline timestamptz,                 -- optional

  status           text NOT NULL DEFAULT 'open',    -- 'open' | 'closed' | 'filled'
  applications_count integer NOT NULL DEFAULT 0,    -- denormalized for cheap sort/filter

  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),

  CHECK (char_length(title) BETWEEN 3 AND 120),
  CHECK (char_length(description) BETWEEN 20 AND 4000),
  CHECK (location_type IN ('remote', 'local', 'either')),
  CHECK (status IN ('open', 'closed', 'filled'))
);

CREATE INDEX IF NOT EXISTS idx_brand_deals_open
  ON public.brand_deals(status, created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_brand_deals_business
  ON public.brand_deals(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_deals_category
  ON public.brand_deals(creator_category, status)
  WHERE status = 'open';

ALTER TABLE public.brand_deals ENABLE ROW LEVEL SECURITY;

-- Any authenticated member can read OPEN briefs (browse without paywall);
-- the paywall is a soft-gate on the APPLY action, not on browsing.
DROP POLICY IF EXISTS "Members read open brand deals" ON public.brand_deals;
CREATE POLICY "Members read open brand deals"
  ON public.brand_deals FOR SELECT
  TO authenticated
  USING (status = 'open' OR posted_by = auth.uid());

-- Only subscribed business owners can INSERT briefs, and only for their
-- own business. Business_profiles has UNIQUE(user_id) so this maps 1:1.
DROP POLICY IF EXISTS "Subscribed owner posts a brand deal" ON public.brand_deals;
CREATE POLICY "Subscribed owner posts a brand deal"
  ON public.brand_deals FOR INSERT
  TO authenticated
  WITH CHECK (
    posted_by = auth.uid()
    AND public.is_subscribed(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.business_profiles b
      WHERE b.id = business_id
        AND b.user_id = auth.uid()
    )
  );

-- Owners can update / close their own briefs.
DROP POLICY IF EXISTS "Owner updates own brand deal" ON public.brand_deals;
CREATE POLICY "Owner updates own brand deal"
  ON public.brand_deals FOR UPDATE
  TO authenticated
  USING (posted_by = auth.uid())
  WITH CHECK (posted_by = auth.uid());

-- Owners can delete drafts they haven't received applications on.
DROP POLICY IF EXISTS "Owner deletes own brand deal" ON public.brand_deals;
CREATE POLICY "Owner deletes own brand deal"
  ON public.brand_deals FOR DELETE
  TO authenticated
  USING (posted_by = auth.uid() AND applications_count = 0);

-- ---------- brand_deal_applications -------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_deal_applications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        uuid NOT NULL REFERENCES public.brand_deals(id) ON DELETE CASCADE,
  creator_id     uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  intro_message  text NOT NULL,
  proposed_rate_cents integer,                      -- null = negotiable
  proposed_timeline   text,

  status         text NOT NULL DEFAULT 'submitted', -- 'submitted' | 'shortlisted' | 'hired' | 'declined' | 'withdrawn'
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),

  UNIQUE(deal_id, creator_id),                      -- one application per creator per deal
  CHECK (char_length(intro_message) BETWEEN 20 AND 2000),
  CHECK (status IN ('submitted', 'shortlisted', 'hired', 'declined', 'withdrawn'))
);

CREATE INDEX IF NOT EXISTS idx_bda_by_deal
  ON public.brand_deal_applications(deal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bda_by_creator
  ON public.brand_deal_applications(creator_id, created_at DESC);

ALTER TABLE public.brand_deal_applications ENABLE ROW LEVEL SECURITY;

-- Creator can read their own applications; business owner can read
-- applications submitted to their deals.
DROP POLICY IF EXISTS "Creator + owner read applications" ON public.brand_deal_applications;
CREATE POLICY "Creator + owner read applications"
  ON public.brand_deal_applications FOR SELECT
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.brand_deals d
      WHERE d.id = deal_id AND d.posted_by = auth.uid()
    )
  );

-- Only subscribed creators can apply, only to OPEN deals, only to
-- deals they're not the poster of. Cannot apply twice thanks to
-- the UNIQUE(deal_id, creator_id) constraint.
DROP POLICY IF EXISTS "Subscribed creator applies" ON public.brand_deal_applications;
CREATE POLICY "Subscribed creator applies"
  ON public.brand_deal_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND public.is_subscribed(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.brand_deals d
      WHERE d.id = deal_id
        AND d.status = 'open'
        AND d.posted_by <> auth.uid()
    )
  );

-- Creator can withdraw their own; business owner can update status
-- on applications submitted to their deals.
DROP POLICY IF EXISTS "Creator or owner updates application" ON public.brand_deal_applications;
CREATE POLICY "Creator or owner updates application"
  ON public.brand_deal_applications FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.brand_deals d
      WHERE d.id = deal_id AND d.posted_by = auth.uid()
    )
  );

-- ---------- keep applications_count in sync -----------------------------
-- Trigger increments the counter on INSERT and decrements on DELETE so
-- the browse page can sort / filter without an aggregate scan.
CREATE OR REPLACE FUNCTION public.bump_brand_deal_apps_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.brand_deals
       SET applications_count = applications_count + 1,
           updated_at = NOW()
     WHERE id = NEW.deal_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.brand_deals
       SET applications_count = GREATEST(applications_count - 1, 0),
           updated_at = NOW()
     WHERE id = OLD.deal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_brand_deal_apps_count ON public.brand_deal_applications;
CREATE TRIGGER trg_brand_deal_apps_count
  AFTER INSERT OR DELETE ON public.brand_deal_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_brand_deal_apps_count();

GRANT EXECUTE ON FUNCTION public.bump_brand_deal_apps_count() TO authenticated;

-- ---------- notification: new application -------------------------------
-- When a creator submits an application, drop a notification into the
-- business owner's bell menu.
CREATE OR REPLACE FUNCTION public.notify_on_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deal_owner UUID;
  deal_title TEXT;
  creator_username TEXT;
BEGIN
  SELECT posted_by, title INTO deal_owner, deal_title
    FROM public.brand_deals WHERE id = NEW.deal_id;
  SELECT username INTO creator_username
    FROM public.profiles WHERE user_id = NEW.creator_id;

  IF deal_owner IS NULL OR deal_owner = NEW.creator_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, body, action_url, related_user_id, is_read, created_at
  )
  VALUES (
    deal_owner,
    'brand_deal_new_application',
    'New brand deal application',
    '@' || COALESCE(creator_username, 'someone') || ' applied to "' || COALESCE(deal_title, 'your brief') || '"',
    '/brand-deals/' || NEW.deal_id,
    NEW.creator_id,
    FALSE,
    NOW()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_application ON public.brand_deal_applications;
CREATE TRIGGER trg_notify_on_new_application
  AFTER INSERT ON public.brand_deal_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_application();

GRANT EXECUTE ON FUNCTION public.notify_on_new_application() TO authenticated;

-- ---------- one-time announcement blast --------------------------------
-- Every existing user gets a one-time notification about the new Brand
-- Deals marketplace on their next login. Copy varies by account type:
--   * business owners see the "post a brief" call-to-action
--   * everyone else sees the "browse and apply" version
-- Dedupes on notification type so re-running is safe.
INSERT INTO public.notifications (
  user_id, type, title, body, action_url, is_read, created_at
)
SELECT
  p.user_id,
  'brand_deals_announce',
  'New feature: Brand Deals',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.business_profiles b WHERE b.user_id = p.user_id
    )
    THEN 'Post paid creator briefs from your business profile. Subscribed creators on Mitype can apply directly and reach you through your inbox.'
    ELSE 'Browse paid creator briefs from Mitype small businesses. Subscribed creators can apply directly and start earning.'
  END,
  '/brand-deals',
  FALSE,
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = p.user_id
    AND n.type = 'brand_deals_announce'
);
