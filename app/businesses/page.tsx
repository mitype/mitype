'use client';
// /businesses — dedicated small business browse page.
//
// Reached from the hamburger nav (entry "Small Businesses"). Lists every
// published business profile in a clean grid with search + category
// filtering. Public to authenticated members (free + subscribers) so
// free-tier users can browse + decide to subscribe. When there are no
// published businesses we explain that listings will appear here as
// members establish their small business listings.

import { useEffect, useMemo, useState } from 'react';
import { FeatureInfoButton } from '../components/FeatureInfoButton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';

interface BusinessRow {
  id: string;
  user_id: string;
  business_name: string;
  category: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  is_online_only: boolean | null;
  online_label: string | null;
  owner_username: string | null;
}

export default function BusinessesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      // Paywall: only subscribers can browse the business directory.
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (sub?.status !== 'active' && sub?.status !== 'trialing') {
        router.push('/subscription');
        return;
      }
      setUser(user);

      // All published business profiles. Two-step: fetch businesses, then
      // map their owner user_id → username so we can deep-link to the
      // public business profile via /business/<username>.
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('id, user_id, business_name, category, logo_url, city, state, is_online_only, online_label')
        .eq('is_published', true)
        .order('business_name', { ascending: true })
        .limit(400);

      if (!biz || biz.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const ownerIds = Array.from(new Set(biz.map((b: any) => b.user_id)));
      const { data: owners } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', ownerIds);
      const ownerMap = new Map<string, string>(
        (owners ?? []).map((p: any) => [p.user_id, p.username]),
      );

      setRows(
        biz.map((b: any) => ({
          ...b,
          owner_username: ownerMap.get(b.user_id) ?? null,
        })),
      );
      setLoading(false);
    })();
  }, [router]);

  // Unique categories, sorted, used for the filter chips.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.category) set.add(r.category);
    return Array.from(set).sort();
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (debouncedSearch) {
        const hay = [
          r.business_name,
          r.category ?? '',
          r.city ?? '',
          r.state ?? '',
        ].join(' ').toLowerCase();
        if (!hay.includes(debouncedSearch)) return false;
      }
      return true;
    });
  }, [rows, categoryFilter, debouncedSearch]);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-business-bg-pale) 0%, var(--brand-business-bg-lavender) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={user?.id} showBack backFallbackHref="/dashboard" accent="purple" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            background: 'linear-gradient(135deg, var(--brand-business), var(--brand-business-light))',
            borderRadius: 100,
            color: 'white',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            <span aria-hidden="true">🏪</span> Small Businesses
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 900,
            color: 'var(--brand-business-deepest)',
            letterSpacing: '-0.6px',
            lineHeight: 1.15,
          }}>
            Mitype small businesses
          </h1>
          <p style={{ margin: '6px 0 0', color: '#5b4a8a', fontSize: 14, lineHeight: 1.5 }}>
            Discover and message Mitype members who run their own business. Local shops,
            online stores, services, and creatives.
          </p>
        </div>

        {/* Search + category filters */}
        {rows.length > 0 && (
          <div style={{
            background: 'white',
            border: '1px solid rgba(139,92,246,0.18)',
            borderRadius: 18,
            padding: 14,
            marginBottom: 20,
            boxShadow: '0 6px 16px rgba(139,92,246,0.06)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: 'var(--brand-business-bg-pale)',
              border: '1px solid rgba(139,92,246,0.18)',
              borderRadius: 100,
              marginBottom: 12,
            }}>
              <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--brand-business-deep)' }}>🔍</span>
              <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={search}
                onChange={(e) => setSearch(e.target.value.slice(0, 80))}
                placeholder="Search businesses…"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Search small businesses"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 16,
                  color: 'var(--brand-text-primary)',
                  fontFamily: 'inherit',
                  minWidth: 0,
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  style={{
                    width: 26, height: 26, border: 'none',
                    borderRadius: '50%',
                    background: 'rgba(139,92,246,0.12)',
                    color: 'var(--brand-business-deep)',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Chip label="All" active={!categoryFilter} onClick={() => setCategoryFilter('')} />
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={categoryFilter === c}
                  onClick={() => setCategoryFilter((prev) => (prev === c ? '' : c))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Grid / empty state */}
        {loading ? (
          <p style={{ color: 'var(--brand-business-text-mid)', textAlign: 'center', padding: 40 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <div style={{
            padding: 40,
            textAlign: 'center',
            background: 'rgba(255,255,255,0.7)',
            border: '1px dashed rgba(139,92,246,0.3)',
            borderRadius: 18,
            color: '#5b4a8a',
            fontSize: 14,
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>🏪</div>
            <p style={{ margin: '0 0 6px', fontWeight: 800, color: 'var(--brand-business-deepest)' }}>
              No small businesses yet
            </p>
            <p style={{ margin: 0 }}>
              Small business listings will appear here as Mitype members
              establish their small business listings.
            </p>
            <Link
              href="/edit-business-profile"
              style={{
                display: 'inline-block',
                marginTop: 14,
                padding: '10px 18px',
                background: 'linear-gradient(135deg, var(--brand-business), var(--brand-business-light))',
                color: 'white',
                fontWeight: 800,
                fontSize: 13,
                textDecoration: 'none',
                borderRadius: 100,
                boxShadow: '0 8px 22px rgba(139,92,246,0.3)',
              }}
            >
              Set up your business profile
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div style={{
            padding: 30, textAlign: 'center',
            background: 'rgba(255,255,255,0.7)',
            border: '1px dashed rgba(139,92,246,0.3)',
            borderRadius: 18,
            color: '#5b4a8a',
          }}>
            Nothing matches those filters yet.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
          }}>
            {visible.map((b) => (
              <div
                key={b.id}
                style={{
                  background: 'white',
                  border: '1px solid rgba(139,92,246,0.22)',
                  borderRadius: 18,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 6px 18px rgba(139,92,246,0.08)',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: b.logo_url ? `url(${b.logo_url})` : 'linear-gradient(135deg, var(--brand-business), var(--brand-business-light))',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: 'white', flexShrink: 0,
                  }}>
                    {!b.logo_url && '🏪'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 800, color: 'var(--brand-text-primary)',
                      letterSpacing: '-0.2px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {b.business_name}
                    </div>
                    {b.category && (
                      <div style={{
                        fontSize: 11, color: 'var(--brand-business-text-mid)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {b.category}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--brand-business-text-mid)', marginTop: 2 }}>
                      {b.is_online_only
                        ? (b.online_label || '🌐 Online')
                        : [b.city, b.state].filter(Boolean).join(', ') || '📍 Local'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link
                    href={`/business/${b.owner_username ?? ''}`}
                    aria-label={`View ${b.business_name}`}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      background: 'var(--brand-business)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: 800,
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    View
                  </Link>
                  <Link
                    href={`/messages?user=${encodeURIComponent(b.user_id)}`}
                    aria-label={`Message ${b.business_name}`}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(139,92,246,0.1)',
                      color: 'var(--brand-business-deep)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: 100,
                      fontSize: 12,
                      fontWeight: 800,
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    💬
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
          <FeatureInfoButton featureKey="businesses" />
    </main>
  );
}

function Chip({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        background: active ? 'var(--brand-business)' : 'white',
        color: active ? 'white' : 'var(--brand-business-deep)',
        border: `1px solid ${active ? 'var(--brand-business)' : 'rgba(139,92,246,0.3)'}`,
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
