'use client';
// /collab — Browse open creator-to-creator collab briefs.
// Same visual language as /brand-deals; subscribers can browse and apply.

import { useEffect, useMemo, useState } from 'react';
import { FeatureInfoButton } from '../components/FeatureInfoButton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { liquidGlass } from '../lib/liquidGlass';

interface BriefRow {
  id: string;
  posted_by: string;
  title: string;
  description: string;
  looking_for_category: string | null;
  compensation_type: 'paid' | 'trade' | 'revenue_share' | 'credit';
  compensation_details: string | null;
  location_type: 'remote' | 'local' | 'either';
  city: string | null;
  applications_count: number;
  created_at: string;
  poster: { username: string; avatar_url: string | null } | null;
}

const COMP_LABELS: Record<BriefRow['compensation_type'], string> = {
  paid: 'Paid',
  trade: 'Trade',
  revenue_share: 'Revenue share',
  credit: 'Credit',
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function CollabBoardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);

      const [subRes, briefsRes] = await Promise.all([
        supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('collab_briefs')
          .select('id, posted_by, title, description, looking_for_category, compensation_type, compensation_details, location_type, city, applications_count, created_at')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(60),
      ]);
      const s = subRes.data?.status;
      setIsSubscribed(s === 'active' || s === 'trialing');

      const posterIds = Array.from(new Set((briefsRes.data ?? []).map((b: any) => b.posted_by)));
      const postersRes = posterIds.length
        ? await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', posterIds)
        : { data: [] as any[] };
      const posterMap = new Map<string, any>((postersRes.data ?? []).map((p: any) => [p.user_id, p]));

      setBriefs((briefsRes.data ?? []).map((b: any) => ({
        ...b,
        poster: posterMap.get(b.posted_by) ?? null,
      })));
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return briefs;
    return briefs.filter((b) =>
      b.title.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      (b.poster?.username.toLowerCase().includes(q) ?? false)
    );
  }, [briefs, query]);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/dashboard" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6 }}>Marketplace</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.8px', marginBottom: 8 }}>Collab Board</h1>
        <p style={{ color: 'var(--brand-personal-text-mid)', fontSize: 14, lineHeight: 1.5, marginBottom: 20, maxWidth: 640 }}>
          Creator to creator project briefs. Post what you need, or apply to help another creator with theirs. Subscribed members only.
        </p>

        <Link
          href={isSubscribed ? '/collab/new' : '/subscription'}
          style={{ ...liquidGlass({ tone: 'warm' }), display: 'inline-block', padding: '10px 22px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, textDecoration: 'none', marginBottom: 20 }}
        >
          {isSubscribed ? 'Post a collab brief' : 'Subscribe to post'}
        </Link>

        <input
          type="search"
          placeholder="Search briefs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', border: '1px solid rgba(200,149,108,0.25)', borderRadius: 12, fontSize: 16, background: 'white', color: 'var(--brand-text-primary)', outline: 'none', marginBottom: 20, boxSizing: 'border-box', fontFamily: 'inherit' }}
        />

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--brand-personal)', padding: '48px 0' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', background: 'white', border: '1px solid rgba(200,149,108,0.15)', borderRadius: 16, color: 'var(--brand-personal-text-light)', fontSize: 14 }}>
            No collab briefs yet. Be the first to post one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((b) => (
              <Link
                key={b.id}
                href={`/collab/${b.id}`}
                style={{ ...liquidGlass({ tone: 'clear', radius: 16, variant: 'lite' }), display: 'block', padding: '16px 18px', textDecoration: 'none', color: 'var(--brand-text-primary)' }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-personal-text-light)', margin: '0 0 4px' }}>
                  {b.poster ? `@${b.poster.username}` : 'A creator'} posted
                </p>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--brand-text-primary)', margin: '0 0 6px', letterSpacing: '-0.2px', lineHeight: 1.3 }}>
                  {b.title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--brand-personal-text-mid)', margin: '0 0 10px', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {b.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, fontWeight: 700 }}>
                  <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(200,149,108,0.12)', color: 'var(--brand-personal)' }}>
                    {COMP_LABELS[b.compensation_type]}
                  </span>
                  {b.looking_for_category && (
                    <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(56,189,248,0.12)', color: '#0369a1' }}>
                      Needs: {b.looking_for_category}
                    </span>
                  )}
                  <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(21,128,61,0.12)', color: 'var(--brand-market)' }}>
                    {b.location_type === 'remote' ? 'Remote' : b.location_type === 'local' ? (b.city ?? 'Local') : 'Remote or local'}
                  </span>
                  <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(0,0,0,0.05)', color: 'var(--brand-personal-text-light)' }}>
                    {b.applications_count} applicant{b.applications_count === 1 ? '' : 's'}
                  </span>
                  <span style={{ marginLeft: 'auto', color: 'var(--brand-personal-text-light)', fontWeight: 500 }}>
                    {timeAgo(b.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
          <FeatureInfoButton featureKey="collab" />
    </main>
  );
}
