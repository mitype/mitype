// Server layout for /business/[username]. Provides per-business Open
// Graph metadata so shared business profile links render with the
// business name, category, and logo as a preview.

import type { Metadata, ResolvingMetadata } from 'next';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

interface Params {
  username: string;
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { username } = await params;
  const handle = username.toLowerCase();
  const fallback: Metadata = {
    title: 'Small business on Mitype',
    description: 'Discover small businesses on Mitype.',
  };

  try {
    const sb = getSupabaseAdmin();
    const { data: owner } = await sb
      .from('profiles')
      .select('user_id')
      .eq('username', handle)
      .maybeSingle();
    if (!owner) return fallback;
    const { data } = await sb
      .from('business_profiles')
      .select('business_name, category, about_services, logo_url, city, state, is_online_only')
      .eq('user_id', owner.user_id)
      .eq('is_published', true)
      .maybeSingle();
    if (!data) return fallback;

    const title = `${data.business_name} on Mitype`;
    const descParts: string[] = [];
    if (data.category) descParts.push(data.category);
    if (data.about_services) descParts.push(String(data.about_services).slice(0, 140));
    if (data.is_online_only) descParts.push('🌐 Online');
    else if (data.city || data.state) descParts.push('📍 ' + [data.city, data.state].filter(Boolean).join(', '));
    const description = descParts.join(' · ') || fallback.description!;
    const images = data.logo_url ? [{ url: data.logo_url }] : undefined;

    return {
      title,
      description,
      openGraph: { title, description, images, type: 'website' },
      twitter: { card: 'summary_large_image', title, description, images: data.logo_url ? [data.logo_url] : undefined },
    };
  } catch {
    return fallback;
  }
}

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
