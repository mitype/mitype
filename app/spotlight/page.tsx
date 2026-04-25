'use client';
// Portfolio Spotlight — a browsable feed of portfolio links pulled from
// every mitype member's profile. Unlike /discover which is person-first
// (one card per user), this feed is work-first: one card per portfolio
// item. Filter chips narrow by portfolio type (music, video, photo, …).
//
// No schema changes — reads `profiles.portfolio_links` (JSONB) directly.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { Avatar } from '../components/Avatar';
import { Skeleton } from '../components/Skeleton';
import { sanitizeText, safeUrl } from '../lib/sanitize';

const PORTFOLIO_TYPES = [
  { value: 'all',       label: '✨ All',         color: '#c8956c' },
  { value: 'music',     label: '🎵 Music',       color: '#d08c6c' },
  { value: 'video',     label: '🎬 Video',       color: '#c07070' },
  { value: 'photo',     label: '📸 Photography', color: '#a08c6c' },
  { value: 'writing',   label: '✍️ Writing',     color: '#8c9070' },
  { value: 'art',       label: '🎨 Art',         color: '#c8956c' },
  { value: 'gaming',    label: '🎮 Gaming',      color: '#9070c0' },
  { value: 'podcast',   label: '🎙️ Podcast',     color: '#6c9ac8' },
  { value: 'business',  label: '💼 Business',    color: '#8a7560' },
  { value: 'social',    label: '📱 Social',      color: '#c8766c' },
  { value: 'other',     label: '🔗 Other',       color: '#a89278' },
];

const PORTFOLIO_ICON: Record<string, string> = {
  music: '🎵', video: '🎬', photo: '📸', writing: '✍️', art: '🎨',
  gaming: '🎮', podcast: '🎙️', business: '💼', social: '📱', other: '🔗',
};

interface PortfolioLink {
  type: string;
  url: string;
  title: string;
}

interface SpotlightItem extends PortfolioLink {
  // Denormalized author info so we don't re-query per render.
  username: string;
  user_id: string;
  avatar_url: string | null;
  creative_status: string | null;
  // Stable key for React (user_id + index of the link within their profile).
  key: string;
}

// Deterministic "shuffle" seeded by today's date so the feed rotates daily
// but stays stable within a day.
function shuffleForToday<T>(items: T[]): T[] {
  const seed = new Date().toDateString()
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return [...items]
    .map((item, i) => ({ item, rank: (seed * (i + 7) * 2654435761) >>> 0 }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

export default function SpotlightPage() {
  const [items, setItems] = useState<SpotlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [authed, setAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        router.push('/login');
        return;
      }

      // Gate behind active/trialing subscription (same pattern as /discover).
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;

      const isSubscribed = sub?.status === 'active' || sub?.status === 'trialing';
      if (!isSubscribed) {
        router.push('/subscription');
        return;
      }

      setAuthed(true);

      // Pull every profile that has a non-empty portfolio_links array.
      // The `.not('portfolio_links', 'eq', '[]')` check skips default empties.
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, creative_status, portfolio_links')
        .not('portfolio_links', 'is', null)
        .limit(500);

      if (cancelled) return;

      if (error || !profiles) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Flatten into one card per portfolio link.
      const flat: SpotlightItem[] = [];
      for (const p of profiles) {
        if (p.user_id === user.id) continue; // don't show the viewer their own work
        const links: PortfolioLink[] = Array.isArray(p.portfolio_links) ? p.portfolio_links : [];
        links.forEach((link, idx) => {
          if (!link || !link.url) return;
          const safe = safeUrl(link.url);
          if (!safe) return;
          flat.push({
            type: String(link.type || 'other').toLowerCase(),
            url: safe,
            title: sanitizeText(link.title) || sanitizeText(link.url),
            username: p.username,
            user_id: p.user_id,
            avatar_url: p.avatar_url ?? null,
            creative_status: p.creative_status ?? null,
            key: `${p.user_id}-${idx}`,
          });
        });
      }

      setItems(shuffleForToday(flat));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [router]);

  const visible = useMemo(() => {
    if (typeFilter === 'all') return items;
    return items.filter((it) => it.type === typeFilter);
  }, [items, typeFilter]);

  // Counts per type so chips can show "🎵 Music · 12" at a glance.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const it of items) c[it.type] = (c[it.type] ?? 0) + 1;
    return c;
  }, [items]);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      {/* Top nav — mirrors /dashboard so it feels like part of the app. */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid rgba(200,149,108,0.15)',
        background: 'rgba(250,246,240,0.9)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <Link href="/dashboard" style={{
          fontSize: 24, fontWeight: 900, color: '#c8956c',
          letterSpacing: '-1px', textDecoration: 'none',
        }}>
          mitype
        </Link>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/discover" style={navLinkStyle}>Discover</Link>
          <Link href="/spotlight" style={{ ...navLinkStyle, color: '#c8956c', background: 'rgba(200,149,108,0.1)' }}>Spotlight</Link>
          <Link href="/weekly" style={navLinkStyle}>Weekly</Link>
          <Link href="/messages" style={navLinkStyle}>Messages</Link>
          <Link href="/dashboard" style={navLinkStyle}>Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 0' }}>
        <h1 style={{
          fontSize: 40,
          fontWeight: 900,
          color: '#1a1208',
          letterSpacing: '-1px',
          marginBottom: 8,
        }}>
          ✨ Spotlight
        </h1>
        <p style={{ color: '#8a7560', fontSize: 16, maxWidth: 640, marginBottom: 28 }}>
          A feed of work from mitype members — music, films, photos, writing, and more.
          Tap a card to open the creator&apos;s portfolio, or tap the avatar to see their profile.
        </p>

        {/* Filter chips */}
        <div
          role="tablist"
          aria-label="Filter portfolio by type"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 28,
            paddingBottom: 4,
          }}
        >
          {PORTFOLIO_TYPES.map((t) => {
            const active = typeFilter === t.value;
            const n = counts[t.value] ?? 0;
            const disabled = !loading && n === 0 && t.value !== 'all';
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => setTypeFilter(t.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 100,
                  border: `1px solid ${active ? t.color : 'rgba(200,149,108,0.2)'}`,
                  background: active ? t.color : 'white',
                  color: active ? 'white' : disabled ? '#c9bfb4' : '#1a1208',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
                {!loading && t.value !== 'all' && n > 0 && (
                  <span style={{
                    marginLeft: 6,
                    fontSize: 11,
                    opacity: active ? 0.85 : 0.6,
                    fontWeight: 600,
                  }}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feed */}
        {loading || !authed ? (
          <SpotlightGridSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState typeFilter={typeFilter} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20,
          }}>
            {visible.map((item) => (
              <SpotlightCard key={item.key} item={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: '#8a7560',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600,
  padding: '8px 16px',
  borderRadius: 100,
};

function SpotlightCard({ item }: { item: SpotlightItem }) {
  const icon = PORTFOLIO_ICON[item.type] ?? '🔗';
  // Strip protocol for a cleaner display host (e.g. "open.spotify.com/…")
  let displayHost = '';
  try { displayHost = new URL(item.url).hostname.replace(/^www\./, ''); } catch { /* noop */ }

  // Pick a warm tint per type so cards don't all look identical.
  const tint = PORTFOLIO_TYPES.find((t) => t.value === item.type)?.color ?? '#c8956c';

  return (
    <article
      style={{
        background: 'white',
        border: '1px solid rgba(200,149,108,0.2)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Gradient header with big emoji — gives the card a "portfolio type" feel
          without needing thumbnails (we don't OG-scrape external URLs here). */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        aria-label={`Open ${item.title} on ${displayHost || 'external site'}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 140,
          background: `linear-gradient(135deg, ${tint}22 0%, ${tint}11 100%)`,
          fontSize: 64,
          textDecoration: 'none',
          position: 'relative',
        }}
      >
        <span aria-hidden="true">{icon}</span>
        <span style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(255,255,255,0.92)',
          border: `1px solid ${tint}44`,
          color: tint,
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 100,
          textTransform: 'capitalize',
        }}>
          {item.type}
        </span>
      </a>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            style={{
              color: '#1a1208',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'block',
              lineHeight: 1.3,
              marginBottom: 4,
              wordBreak: 'break-word',
            }}
          >
            {item.title}
          </a>
          {displayHost && (
            <span style={{ color: '#a89278', fontSize: 12, fontWeight: 500 }}>
              ↗ {displayHost}
            </span>
          )}
        </div>

        {/* Author footer — clickable avatar + username → /profile/[username] */}
        <Link
          href={`/profile/${item.username}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 8,
            borderRadius: 12,
            background: '#faf6f0',
            textDecoration: 'none',
            marginTop: 'auto',
          }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#f0e8df',
            flexShrink: 0,
          }}>
            <Avatar
              src={item.avatar_url}
              alt={`${item.username}'s avatar`}
              width={32}
              height={32}
              sizes="32px"
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#1a1208', fontSize: 13, fontWeight: 700 }}>
              @{item.username}
            </div>
            {item.creative_status && (
              <div style={{
                color: '#8a7560',
                fontSize: 11,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.creative_status}
              </div>
            )}
          </div>
        </Link>
      </div>
    </article>
  );
}

function EmptyState({ typeFilter }: { typeFilter: string }) {
  const label = PORTFOLIO_TYPES.find((t) => t.value === typeFilter)?.label ?? 'items';
  return (
    <div
      role="status"
      style={{
        background: 'white',
        border: '1px dashed rgba(200,149,108,0.3)',
        borderRadius: 20,
        padding: '60px 24px',
        textAlign: 'center',
        color: '#8a7560',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🎭</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1208', marginBottom: 8 }}>
        Nothing here yet
      </h2>
      <p style={{ fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
        {typeFilter === 'all'
          ? "No one's shared portfolio links yet — be the first!"
          : `No ${label} portfolios yet. Check back soon, or try another filter.`}
      </p>
      <Link
        href="/edit-profile"
        style={{
          display: 'inline-block',
          marginTop: 20,
          padding: '10px 20px',
          background: '#c8956c',
          color: 'white',
          fontWeight: 700,
          fontSize: 14,
          borderRadius: 100,
          textDecoration: 'none',
        }}
      >
        Add your own work →
      </Link>
    </div>
  );
}

function SpotlightGridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading portfolio spotlight"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 20,
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.15)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <Skeleton width="100%" height={140} radius={0} />
          <div style={{ padding: 16 }}>
            <Skeleton width="85%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="50%" height={12} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={48} radius={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
