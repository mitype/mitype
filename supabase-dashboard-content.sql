-- Command Center: admin-only content (social numbers, sales, ideas, tasks, links).
-- Run in the Supabase SQL editor. Requires supabase-dashboard-products.sql to have been run first
-- (it creates public.dashboard_is_admin()). Safe to run again; it never overwrites edits.

CREATE TABLE IF NOT EXISTS public.dashboard_content (
  id         TEXT PRIMARY KEY,
  content    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_content ENABLE ROW LEVEL SECURITY;

-- Admin only. Nobody else can read, write or even see that rows exist.
DROP POLICY IF EXISTS dashboard_content_admin_all ON public.dashboard_content;
CREATE POLICY dashboard_content_admin_all ON public.dashboard_content
  FOR ALL TO authenticated
  USING (public.dashboard_is_admin())
  WITH CHECK (public.dashboard_is_admin());

REVOKE ALL ON public.dashboard_content FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.dashboard_content TO authenticated;

INSERT INTO public.dashboard_content (id, content)
VALUES ('main', $json$
{
  "salesAsOf": "Nov 11",
  "bookSales": [
    { "title": "The Timeline: 80s", "units": 0 },
    { "title": "The Timeline: 90s", "units": 0 }
  ],
  "socialsAsOf": "Nov 11",
  "socials": [
    { "name": "Instagram", "big": "5,071", "unit": "followers", "lines": ["32.1K views, last 30 days", "825 interactions", "159 profile visits, 4 link taps"] },
    { "name": "TikTok", "big": "3K", "unit": "followers", "lines": ["14.7K video views, last 7 days", "386 likes, 35 comments, 13 shares", "90 profile views"] },
    { "name": "Facebook", "big": "1.2K", "unit": "views from Instagram, 30 days", "lines": ["Page insights not read yet"] },
    { "name": "YouTube", "big": "--", "unit": "not connected yet", "lines": ["Studio blocks my reader, needs a different method"] },
    { "name": "TuneCore", "big": "--", "unit": "streams only, no earnings shown", "lines": ["Not connected yet"] }
  ],
  "ideas": [
    { "id": "ig-link", "title": "Put both Timeline books in your Instagram bio link", "why": "4 link taps in 30 days. A link to the series page gives those taps somewhere to sell." },
    { "id": "tt-shop", "title": "Check TikTok Shop for books and Christmas products", "why": "TikTok Studio lists Monetization tools. Shop and affiliate access depend on follower and region rules." },
    { "id": "amz-assoc", "title": "Join Amazon Associates for commission links", "why": "Earn commission on products you feature, including your own Amazon books and gift picks." },
    { "id": "reel-set", "title": "Post a two-book Timeline reel (80s and 90s)", "why": "Reels drive 64% of your Instagram views and 97% come from non-followers." },
    { "id": "xmas-shop", "title": "Add Christmas finds to your ShopMy with photos and links", "why": "Seasonal demand peaks soon. Use the product uploader below." }
  ],
  "tasks": [
    "Post the launch posts for both Timeline books",
    "Stage 4 videos as drafts on TikTok, Instagram, Facebook",
    "Photograph the Christmas products and add them below",
    "Connect YouTube and X to the dashboard"
  ],
  "links": [
    { "label": "KDP Bookshelf", "href": "https://kdp.amazon.com/en_US/bookshelf" },
    { "label": "KDP Reports", "href": "https://kdpreports.amazon.com/dashboard" },
    { "label": "Author Central", "href": "https://author.amazon.com/home" },
    { "label": "Firefly", "href": "https://firefly.adobe.com/generate/image" },
    { "label": "TikTok Studio", "href": "https://www.tiktok.com/tiktokstudio" },
    { "label": "Instagram", "href": "https://www.instagram.com/accounts/insights/" },
    { "label": "YouTube Studio", "href": "https://studio.youtube.com" },
    { "label": "ShopMy", "href": "https://shopmy.us/links" },
    { "label": "Admin", "href": "/admin" },
    { "label": "Moments", "href": "/moments" }
  ],
  "briefing": [
    "Both Timeline books are live on Amazon and linked as a series.",
    "Instagram has 5,071 followers and TikTok about 3K. Most views come from people who do not follow you yet, so new posts reach new audiences."
  ]
}
$json$::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Check: 1 row, and RLS on.
SELECT
  (SELECT count(*) FROM public.dashboard_content) AS rows,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.dashboard_content'::regclass) AS rls_on;
