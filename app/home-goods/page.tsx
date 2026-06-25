'use client';
// /home-goods — Mi Home Goods marketplace browse page.
//
// Public to all authenticated users (free + subscribers) so anyone can
// see what's for sale and decide to subscribe to list/buy. The first
// time a user lands here we show the safety acknowledgement modal;
// after they've accepted it once we never show it again.
//
// Filters: category chips, "near me" toggle (uses the city/state on
// the viewer's profile), search by text.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { HomeGoodsListingCard, type HomeGoodsListingLite } from '../components/HomeGoodsListingCard';
import { HomeGoodsSafetyModal } from '../components/HomeGoodsSafetyModal';
import { EmptyState } from '../components/EmptyState';
import { HOME_GOODS_CATEGORIES } from '../lib/homeGoodsCategories';
import { toast } from '../lib/toast';

export default function HomeGoodsBrowsePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<HomeGoodsListingLite[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [nearMe, setNearMe] = useState(false);
  const [myState, setMyState] = useState<string>('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Subscription status (controls whether "Sell something" CTA
      // takes the user straight into the create flow or to /subscription).
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsSubscribed(sub?.status === 'active' || sub?.status === 'trialing');

      // First-time safety acknowledgement.
      const { data: profile } = await supabase
        .from('profiles')
        .select('home_goods_terms_accepted_at, state')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile?.home_goods_terms_accepted_at) {
        setShowSafety(true);
      }
      setMyState(profile?.state ?? '');
    })();
  }, [router]);

  // Load listings whenever filters change.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('home_goods_listings')
        .select('id, title, price_cents, price_kind, category, photo_urls, city, state, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(120);
      if (categoryFilter) q = q.eq('category', categoryFilter);
      if (debouncedSearch) {
        const esc = debouncedSearch.replace(/[%_]/g, (m) => `\\${m}`);
        q = q.or(`title.ilike.%${esc}%,description.ilike.%${esc}%`);
      }
      if (nearMe && myState) {
        q = q.ilike('state', myState);
      }
      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error('[home-goods] browse load failed:', error);
        setListings([]);
      } else {
        setListings((data ?? []) as HomeGoodsListingLite[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, categoryFilter, debouncedSearch, nearMe, myState]);

  function handleSellClick() {
    if (!isSubscribed) {
      router.push('/subscription');
      return;
    }
    router.push('/home-goods/new');
  }

  const sellersTipShown = useMemo(() => isSubscribed, [isSubscribed]);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-market-bg-pale) 0%, var(--brand-market-bg-mint) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={user?.id} showBack backFallbackHref="/dashboard" accent="bronze" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              background: 'linear-gradient(135deg, var(--brand-market), var(--brand-market-light))',
              borderRadius: 100,
              color: 'white',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              <span aria-hidden="true">🏡</span> Mi Home Goods
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 900,
              color: 'var(--brand-market-deep)',
              letterSpacing: '-0.8px',
              lineHeight: 1.1,
            }}>
              Buy and sell with your Mitype community
            </h1>
            <p style={{
              margin: '6px 0 0',
              color: 'var(--brand-market-text-mid)',
              fontSize: 14,
              lineHeight: 1.5,
              maxWidth: 560,
            }}>
              Furniture, electronics, instruments, vintage finds. List it, browse it, message the seller, and meet up safely.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link
              href="/home-goods/mine"
              style={{
                padding: '11px 20px',
                background: 'white',
                color: 'var(--brand-market)',
                border: '1px solid rgba(21,128,61,0.35)',
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 800,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              My listings
            </Link>
            <button
              type="button"
              onClick={handleSellClick}
              style={{
                padding: '11px 22px',
                background: 'linear-gradient(135deg, var(--brand-market), var(--brand-market-light))',
                color: 'white',
                border: 'none',
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 8px 22px rgba(21,128,61,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              + Sell something
            </button>
          </div>
        </div>

        {/* Search + filters */}
        <div style={{
          background: 'white',
          border: '1px solid rgba(21,128,61,0.18)',
          borderRadius: 18,
          padding: 14,
          marginBottom: 20,
          boxShadow: '0 6px 16px rgba(21,128,61,0.06)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            background: 'var(--brand-market-bg-pale)',
            border: '1px solid rgba(21,128,61,0.18)',
            borderRadius: 100,
            marginBottom: 12,
          }}>
            <span aria-hidden="true" style={{ fontSize: 16, color: 'var(--brand-market-text-mid)' }}>🔍</span>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={search}
              onChange={(e) => setSearch(e.target.value.slice(0, 80))}
              placeholder="Search listings…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Search Mi Home Goods"
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
                  width: 26, height: 26,
                  border: 'none',
                  borderRadius: '50%',
                  background: 'rgba(21,128,61,0.12)',
                  color: 'var(--brand-market-text-mid)',
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
            <FilterChip
              label="All"
              active={!categoryFilter}
              onClick={() => setCategoryFilter('')}
            />
            {myState && (
              <FilterChip
                label={`Near me (${myState})`}
                active={nearMe}
                onClick={() => setNearMe((v) => !v)}
              />
            )}
            {HOME_GOODS_CATEGORIES.map((c) => (
              <FilterChip
                key={c.key}
                label={`${c.emoji} ${c.label}`}
                active={categoryFilter === c.key}
                onClick={() => setCategoryFilter(c.key === categoryFilter ? '' : c.key)}
              />
            ))}
          </div>
        </div>

        {/* Listings grid */}
        {loading ? (
          <p style={{ color: '#5b7a68', textAlign: 'center', padding: 40 }}>
            Loading…
          </p>
        ) : listings.length === 0 ? (
          categoryFilter || debouncedSearch || nearMe ? (
            <EmptyState
              tone="market"
              icon="🛍️"
              title="Nothing matches those filters yet."
            />
          ) : (
            <EmptyState
              tone="market"
              icon="🛍️"
              title="No listings yet"
              body={
                <p style={{ margin: 0 }}>
                  The marketplace is brand new. Items will appear here as Mitype
                  members post their Mi Home Goods listings.
                </p>
              }
              action={sellersTipShown ? (
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--brand-market)' }}>
                  Be the first. Tap &quot;+ Sell something&quot; above.
                </p>
              ) : undefined}
            />
          )
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 14,
          }}>
            {listings.map((l) => (
              <HomeGoodsListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>

      {user && (
        <HomeGoodsSafetyModal
          open={showSafety}
          userId={user.id}
          onAcknowledged={() => {
            setShowSafety(false);
            toast.success('Welcome to Mi Home Goods');
          }}
          onDismiss={() => {
            setShowSafety(false);
            router.push('/dashboard');
          }}
        />
      )}
    </main>
  );
}

function FilterChip({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        background: active ? 'var(--brand-market)' : 'white',
        color: active ? 'white' : 'var(--brand-market-text-mid)',
        border: `1px solid ${active ? 'var(--brand-market)' : 'rgba(21,128,61,0.25)'}`,
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
