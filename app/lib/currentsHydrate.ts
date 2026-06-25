// Resolves @mentions in a batch of currents into real entity payloads.
//
// One round-trip per entity type (users, businesses, listings) regardless
// of how many currents we're rendering. Used by the feed and detail pages
// to attach rich embed cards to each current.

import { supabase } from './supabaseClient';
import { parseCurrent } from './currentsParser';
import type {
  UserEmbed,
  BusinessEmbed,
  ListingEmbed,
} from '../components/CurrentEntityEmbed';
import { formatPrice } from './homeGoodsCategories';

export interface HydratedEmbeds {
  users: UserEmbed[];
  businesses: BusinessEmbed[];
  listings: ListingEmbed[];
}

export async function hydrateMentions(bodies: string[]): Promise<{
  byBody: Map<string, HydratedEmbeds>;
}> {
  const userHandles = new Set<string>();
  const bizHandles = new Set<string>();
  const listingIds = new Set<string>();

  for (const body of bodies) {
    const parsed = parseCurrent(body);
    for (const m of parsed.mentions) {
      if (m.kind === 'user') userHandles.add(m.handle);
      else if (m.kind === 'business') bizHandles.add(m.handle);
      else if (m.kind === 'listing') listingIds.add(m.handle);
    }
  }

  // Fetch all three in parallel.
  const [usersRes, bizOwnersRes, listingsRes] = await Promise.all([
    userHandles.size > 0
      ? supabase.from('profiles')
          .select('username, avatar_url, bio')
          .in('username', Array.from(userHandles))
      : Promise.resolve({ data: [] as any[] }),
    bizHandles.size > 0
      ? supabase.from('profiles')
          .select('user_id, username')
          .in('username', Array.from(bizHandles))
      : Promise.resolve({ data: [] as any[] }),
    listingIds.size > 0
      ? supabase.from('home_goods_listings')
          .select('id, title, price_cents, price_kind, photo_urls, status')
          .in('id', Array.from(listingIds))
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const userByHandle = new Map<string, UserEmbed>();
  for (const u of usersRes.data ?? []) {
    userByHandle.set(u.username.toLowerCase(), {
      username: u.username,
      avatar_url: u.avatar_url,
      bio: u.bio,
    });
  }

  const bizByHandle = new Map<string, BusinessEmbed>();
  const ownerIds = (bizOwnersRes.data ?? []).map((o: any) => o.user_id);
  if (ownerIds.length > 0) {
    const { data: bizRows } = await supabase
      .from('business_profiles')
      .select('user_id, business_name, category, logo_url, is_published')
      .in('user_id', ownerIds)
      .eq('is_published', true);
    const ownerToUsername = new Map<string, string>(
      (bizOwnersRes.data ?? []).map((o: any) => [o.user_id, o.username]),
    );
    for (const b of bizRows ?? []) {
      const u = ownerToUsername.get(b.user_id);
      if (!u) continue;
      bizByHandle.set(u.toLowerCase(), {
        owner_username: u,
        business_name: b.business_name,
        category: b.category,
        logo_url: b.logo_url,
      });
    }
  }

  const listingById = new Map<string, ListingEmbed>();
  for (const l of listingsRes.data ?? []) {
    listingById.set(l.id.toLowerCase(), {
      id: l.id,
      title: l.title,
      price_label: formatPrice(l.price_cents, l.price_kind),
      photo_url: Array.isArray(l.photo_urls) ? l.photo_urls[0] ?? null : null,
    });
  }

  const byBody = new Map<string, HydratedEmbeds>();
  for (const body of bodies) {
    const parsed = parseCurrent(body);
    const users: UserEmbed[] = [];
    const businesses: BusinessEmbed[] = [];
    const listings: ListingEmbed[] = [];
    for (const m of parsed.mentions) {
      if (m.kind === 'user') {
        const u = userByHandle.get(m.handle);
        if (u) users.push(u);
      } else if (m.kind === 'business') {
        const b = bizByHandle.get(m.handle);
        if (b) businesses.push(b);
      } else if (m.kind === 'listing') {
        const l = listingById.get(m.handle);
        if (l) listings.push(l);
      }
    }
    byBody.set(body, { users, businesses, listings });
  }

  return { byBody };
}
