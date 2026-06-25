'use client';
// /home-goods/mine — the seller's own listings (active + sold + hidden).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { HomeGoodsListingCard, type HomeGoodsListingLite } from '../../components/HomeGoodsListingCard';

export default function MyListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<HomeGoodsListingLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      // Subscription gate.
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      const ok = sub?.status === 'active' || sub?.status === 'trialing';
      if (!ok) {
        router.push('/subscription');
        return;
      }
      setUser(user);
      const { data } = await supabase
        .from('home_goods_listings')
        .select('id, title, price_cents, price_kind, category, photo_urls, city, state, status, created_at')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      setListings((data ?? []) as HomeGoodsListingLite[]);
      setLoading(false);
    })();
  }, [router]);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-market-bg-pale) 0%, var(--brand-market-bg-mint) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={user?.id} showBack backFallbackHref="/home-goods" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          gap: 14,
          flexWrap: 'wrap',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 900,
            color: 'var(--brand-market-deep)',
            letterSpacing: '-0.5px',
          }}>
            My listings
          </h1>
          <Link
            href="/home-goods/new"
            style={{
              padding: '11px 22px',
              background: 'linear-gradient(135deg, var(--brand-market), var(--brand-market-light))',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 8px 22px rgba(21,128,61,0.35)',
            }}
          >
            + New listing
          </Link>
        </div>

        {loading ? (
          <p style={{ color: 'var(--brand-market-text-mid)', textAlign: 'center', padding: 40 }}>
            Loading…
          </p>
        ) : listings.length === 0 ? (
          <div style={{
            padding: 40,
            textAlign: 'center',
            background: 'rgba(255,255,255,0.6)',
            border: '1px dashed rgba(21,128,61,0.3)',
            borderRadius: 18,
            color: 'var(--brand-market-text-mid)',
            fontSize: 14,
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>🛒</div>
            You haven't posted anything yet. Tap "+ New listing" above to get started.
          </div>
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
    </main>
  );
}
