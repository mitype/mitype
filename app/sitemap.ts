// Dynamic sitemap for Mitype. Combines static marketing + legal pages
// with every public profile / published business / active Mi Home Goods
// listing so search engines can discover and index user-generated content.
//
// Reads from Supabase via the admin client. Each section is capped so
// this never blows up on a large site (Next.js recommends multiple
// sitemaps for >50k URLs).

import type { MetadataRoute } from 'next';
import { getSupabaseAdmin } from './lib/supabaseAdmin';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://mitypeapp.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static marketing + legal pages.
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/login`,         lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/signup`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/legal/contact`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/legal/privacy`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/legal/terms`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];

  let profiles: MetadataRoute.Sitemap = [];
  let businesses: MetadataRoute.Sitemap = [];
  let listings: MetadataRoute.Sitemap = [];

  try {
    const sb = getSupabaseAdmin();
    const [{ data: profRows }, { data: bizRows }, { data: lstRows }] = await Promise.all([
      sb.from('profiles')
        .select('username, updated_at')
        .not('username', 'is', null)
        .limit(5000),
      sb.from('business_profiles')
        .select('user_id, updated_at')
        .eq('is_published', true)
        .limit(5000),
      sb.from('home_goods_listings')
        .select('id, updated_at')
        .eq('status', 'active')
        .limit(5000),
    ]);

    profiles = (profRows ?? []).map((r: any) => ({
      url: `${BASE_URL}/profile/${r.username}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Business URLs need to deep-link by owner username, not by uuid.
    const ownerIds = (bizRows ?? []).map((b: any) => b.user_id);
    const ownerMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: owners } = await sb
        .from('profiles')
        .select('user_id, username')
        .in('user_id', ownerIds);
      for (const o of owners ?? []) ownerMap.set(o.user_id, o.username);
    }
    businesses = (bizRows ?? [])
      .map((b: any) => {
        const u = ownerMap.get(b.user_id);
        if (!u) return null;
        return {
          url: `${BASE_URL}/business/${u}`,
          lastModified: b.updated_at ? new Date(b.updated_at) : now,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;

    listings = (lstRows ?? []).map((l: any) => ({
      url: `${BASE_URL}/home-goods/${l.id}`,
      lastModified: l.updated_at ? new Date(l.updated_at) : now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }));
  } catch {
    // If Supabase is unreachable at build time we still emit the static
    // sitemap entries so the marketing pages are indexed.
  }

  return [...staticUrls, ...profiles, ...businesses, ...listings];
}
