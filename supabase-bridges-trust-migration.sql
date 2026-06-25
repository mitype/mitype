-- Bridges + Trust signals migration
--
-- 1) Wave videos can be tagged with a Home Goods listing OR a business
--    profile. Lets creators promote a thing for sale or their shop right
--    from the video. We render a chip on the Wave feed that deep-links
--    to the listing / business when present.
--
-- 2) Saving a Home Goods listing pings the seller (light-touch
--    engagement loop) — handled client-side by inserting a row into
--    `notifications` when the save lands. No SQL needed for the notify
--    itself, but we add an index here for fast "people who saved this
--    listing" lookups in the trust signals on the seller card.

-- ---------- Wave video → Mi Home Goods + Business links --------------
ALTER TABLE public.wave_videos
  ADD COLUMN IF NOT EXISTS linked_listing_id  UUID NULL
    REFERENCES public.home_goods_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_business_id UUID NULL
    REFERENCES public.business_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS wave_videos_linked_listing_idx
  ON public.wave_videos (linked_listing_id)
  WHERE linked_listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wave_videos_linked_business_idx
  ON public.wave_videos (linked_business_id)
  WHERE linked_business_id IS NOT NULL;

COMMENT ON COLUMN public.wave_videos.linked_listing_id IS
  'Optional Mi Home Goods listing the creator promoted in this video. Deep-linked from a chip on the Wave feed.';
COMMENT ON COLUMN public.wave_videos.linked_business_id IS
  'Optional small-business profile the creator promoted in this video. Deep-linked from a chip on the Wave feed.';

-- ---------- Saves lookup index (trust signals) -----------------------
-- Speeds up: "how many people saved this listing" + "did I save it".
CREATE INDEX IF NOT EXISTS home_goods_saves_listing_idx
  ON public.home_goods_saves (listing_id);
