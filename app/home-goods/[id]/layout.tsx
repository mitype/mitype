// Server layout for /home-goods/[id]. Provides Open Graph metadata so
// a shared Mi Home Goods listing preview shows the title, price, and
// first photo in iMessage / Twitter / Slack unfurls.

import type { Metadata, ResolvingMetadata } from 'next';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { formatPrice } from '../../lib/homeGoodsCategories';

interface Params { id: string }

export async function generateMetadata(
  { params }: { params: Promise<Params> },
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = {
    title: 'Mi Home Goods listing',
    description: 'Buy and sell with your Mitype community.',
  };

  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('home_goods_listings')
      .select('title, description, price_cents, price_kind, photo_urls, city, state, status')
      .eq('id', id)
      .maybeSingle();
    if (!data) return fallback;
    if (data.status !== 'active' && data.status !== 'sold') return fallback;

    const price = formatPrice(data.price_cents, data.price_kind);
    const title = `${data.title} · ${price}${data.status === 'sold' ? ' (sold)' : ''} · Mi Home Goods`;
    const loc = [data.city, data.state].filter(Boolean).join(', ');
    const desc = data.description
      ? String(data.description).slice(0, 140)
      : `${price}${loc ? ' · 📍 ' + loc : ''} on Mitype's Mi Home Goods marketplace.`;
    const photo = Array.isArray(data.photo_urls) ? data.photo_urls[0] : undefined;
    const images = photo ? [{ url: photo }] : undefined;

    return {
      title,
      description: desc,
      openGraph: { title, description: desc, images, type: 'website' },
      twitter: { card: 'summary_large_image', title, description: desc, images: photo ? [photo] : undefined },
    };
  } catch {
    return fallback;
  }
}

export default function HomeGoodsListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
