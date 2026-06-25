// Server layout for /profile/[username]. Exists solely to provide
// per-route Open Graph + Twitter Card metadata so shared profile links
// render rich previews. The actual page rendering lives in page.tsx
// (a client component) and is passed through here unchanged.

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
    title: `@${handle} on Mitype`,
    description: 'Mitype connects creative professionals, hobbyists, and passionate people based on what they actually love doing.',
  };

  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('profiles')
      .select('username, avatar_url, bio, categories, city, state')
      .eq('username', handle)
      .maybeSingle();
    if (!data) return fallback;

    const title = `@${data.username} on Mitype`;
    const cats: string[] = Array.isArray(data.categories) ? data.categories.slice(0, 3) : [];
    const loc = [data.city, data.state].filter(Boolean).join(', ');
    const descParts: string[] = [];
    if (data.bio) descParts.push(String(data.bio).slice(0, 140));
    if (cats.length > 0) descParts.push(`Categories: ${cats.join(', ')}.`);
    if (loc) descParts.push(`📍 ${loc}.`);
    const description = descParts.join(' ') || fallback.description!;
    const images = data.avatar_url ? [{ url: data.avatar_url }] : undefined;

    return {
      title,
      description,
      openGraph: { title, description, images, type: 'profile' },
      twitter: { card: 'summary_large_image', title, description, images: data.avatar_url ? [data.avatar_url] : undefined },
    };
  } catch {
    return fallback;
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
