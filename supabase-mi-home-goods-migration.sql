-- ============================================================
-- Mi Home Goods — consolidated migration
-- ============================================================
-- Adds the peer-to-peer "garage sale" marketplace feature:
--
--   home_goods_listings    — the listings themselves
--   home_goods_saves       — buyers' saved/heart'd items
--   profiles.home_goods_terms_accepted_at — one-time safety opt-in
--
-- All listings live in the `home-goods-photos` Storage bucket (created
-- below via a manual bucket-setup step; the SQL can't create buckets).
--
-- Subscription gating is handled in the app, not the database — every
-- write/read uses standard RLS scoped to authenticated users.
--
-- Safe to re-run.
-- ============================================================

-- ─────────────────────────── Profile flag ────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_goods_terms_accepted_at TIMESTAMPTZ;

-- ──────────────────────── Listings table ────────────────────────────

CREATE TABLE IF NOT EXISTS public.home_goods_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 80),
  -- Description is capped at 600 chars — enough to write a real
  -- description without inviting essays.
  description     TEXT CHECK (length(description) <= 600),
  -- Price stored as integer cents to avoid float drift. NULL or 0 = Free.
  price_cents     INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  -- 'firm' or 'obo' (or open to offers) — surfaced as a chip.
  price_kind      TEXT CHECK (price_kind IN ('firm', 'obo', 'free')) DEFAULT 'obo',
  condition       TEXT NOT NULL CHECK (condition IN (
                    'new', 'new-in-box', 'like-new', 'gently-used',
                    'used', 'for-parts'
                  )),
  category        TEXT NOT NULL,
  -- Up to 4 public photo URLs. Stored as text array; the app enforces
  -- the cap of 4 on insert/update.
  photo_urls      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Display location for the listing. We default to whatever's on the
  -- seller's profile but they can override per-listing.
  city            TEXT,
  state           TEXT,
  -- Lifecycle: 'active' (visible), 'sold' (hidden from browse, shown
  -- on seller's "mine" page), 'hidden' (paused by seller).
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'sold', 'hidden')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Browse-by-recency is the dominant access pattern; partial index
-- focuses on 'active' rows only since they're the only ones browsed.
CREATE INDEX IF NOT EXISTS idx_home_goods_listings_active_recent
  ON public.home_goods_listings(created_at DESC)
  WHERE status = 'active';

-- Seller's own-listings page filters by seller_id.
CREATE INDEX IF NOT EXISTS idx_home_goods_listings_seller
  ON public.home_goods_listings(seller_id, created_at DESC);

-- City/state filtering on browse.
CREATE INDEX IF NOT EXISTS idx_home_goods_listings_state_lower
  ON public.home_goods_listings(lower(state))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_home_goods_listings_city_lower
  ON public.home_goods_listings(lower(city))
  WHERE status = 'active';

ALTER TABLE public.home_goods_listings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can READ active listings (so even free-tier
-- users can browse and decide to subscribe). The seller can also see
-- their own non-active rows on their "My listings" page.
DROP POLICY IF EXISTS "Anyone reads active listings" ON public.home_goods_listings;
CREATE POLICY "Anyone reads active listings"
  ON public.home_goods_listings FOR SELECT
  TO authenticated
  USING (status = 'active' OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers insert their listings" ON public.home_goods_listings;
CREATE POLICY "Sellers insert their listings"
  ON public.home_goods_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers update their listings" ON public.home_goods_listings;
CREATE POLICY "Sellers update their listings"
  ON public.home_goods_listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers delete their listings" ON public.home_goods_listings;
CREATE POLICY "Sellers delete their listings"
  ON public.home_goods_listings FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Auto-bump updated_at on every change.
DROP TRIGGER IF EXISTS trg_home_goods_listings_updated_at ON public.home_goods_listings;
CREATE TRIGGER trg_home_goods_listings_updated_at
  BEFORE UPDATE ON public.home_goods_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────── Saves table ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.home_goods_saves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES public.home_goods_listings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_home_goods_saves_user
  ON public.home_goods_saves(user_id, created_at DESC);

ALTER TABLE public.home_goods_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their saves" ON public.home_goods_saves;
CREATE POLICY "Users read their saves"
  ON public.home_goods_saves FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert their saves" ON public.home_goods_saves;
CREATE POLICY "Users insert their saves"
  ON public.home_goods_saves FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their saves" ON public.home_goods_saves;
CREATE POLICY "Users delete their saves"
  ON public.home_goods_saves FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────── Storage bucket — run via UI or SQL ─────────────────
-- After running the rest of this migration, create the public
-- Storage bucket below in the Supabase dashboard
-- (Storage → New bucket):
--
--   Bucket name:  home-goods-photos
--   Public:       YES (so listing photos can be served directly)
--
-- Then add this storage policy so authenticated users can upload to
-- their own folder (Supabase Storage → Policies → New policy):
--
--   Policy name: "Sellers upload their photos"
--   Allowed operation: INSERT
--   USING expression: bucket_id = 'home-goods-photos'
--                     AND (storage.foldername(name))[1] = auth.uid()::text
--
-- And another for DELETE so they can remove old photos:
--
--   Policy name: "Sellers delete their photos"
--   Allowed operation: DELETE
--   USING expression: bucket_id = 'home-goods-photos'
--                     AND (storage.foldername(name))[1] = auth.uid()::text
