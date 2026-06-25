'use client';
// /home-goods/by/[username] — every Mi Home Goods listing from one seller.
//
// Linked from the public profile page when the seller has any active
// listings. Public to all authenticated users so free-tier visitors can
// browse + decide to subscribe before messaging.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { SiteNav } from '../../../components/SiteNav';
import { Avatar } from '../../../components/Avatar';
import {
  HomeGoodsListingCard,
  type HomeGoodsListingLite,
} from '../../../components/HomeGoodsListingCard';
import { HomeGoodsSellerStats } from '../../../components/HomeGoodsSellerStats';
import { EmptyState } from '../../../components/EmptyState';

interface SellerProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
}

export default function SellerListingsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = React.use(params);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<HomeGoodsListingLite[]>([]);
  const [recentlySold, setRecentlySold] = useState<HomeGoodsListingLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, city, state, created_at')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      if (!profile) {
        router.push('/home-goods');
        return;
      }
      setSeller(profile as SellerProfile);

      // Active listings + recently sold archive in parallel.
      const [activeRes, soldRes] = await Promise.all([
        supabase
          .from('home_goods_listings')
          .select('id, title, price_cents, price_kind, category, photo_urls, city, state, status, created_at')
          .eq('seller_id', profile.user_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(120),
        supabase
          .from('home_goods_listings')
          .select('id, title, price_cents, price_kind, category, photo_urls, city, state, status, created_at')
          .eq('seller_id', profile.user_id)
          .eq('status', 'sold')
          .order('updated_at', { ascending: false })
          .limit(8),
      ]);
      setListings((activeRes.data ?? []) as HomeGoodsListingLite[]);
      setRecentlySold((soldRes.data ?? []) as HomeGoodsListingLite[]);
      setLoading(false);
    })();
  }, [username, router]);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-market-bg-pale) 0%, var(--brand-market-bg-mint) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={user?.id} showBack backFallbackHref="/home-goods" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        {/* Header card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 22,
          padding: 16,
          background: 'white',
          border: '1px solid rgba(21,128,61,0.18)',
          borderRadius: 18,
          boxShadow: '0 8px 22px rgba(21,128,61,0.08)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--brand-market-bg-mint)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Avatar
              src={seller?.avatar_url}
              alt={seller?.username ?? 'Seller'}
              width={56}
              height={56}
              fallbackFontSize={22}
              sizes="56px"
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: 'var(--brand-market)',
              marginBottom: 2,
            }}>
              🏡 Mi Home Goods shop
            </div>
            <Link
              href={`/profile/${seller?.username ?? ''}`}
              style={{
                fontSize: 19,
                fontWeight: 900,
                color: 'var(--brand-market-deep)',
                textDecoration: 'none',
                letterSpacing: '-0.4px',
              }}
            >
              @{seller?.username}
            </Link>
            {(seller?.city || seller?.state) && (
              <p style={{ margin: '2px 0 0', color: 'var(--brand-market-text-mid)', fontSize: 12 }}>
                📍 {[seller?.city, seller?.state].filter(Boolean).join(', ')}
              </p>
            )}
            {/* Trust pills sit under the location line. */}
            {seller && (
              <HomeGoodsSellerStats
                sellerId={seller.user_id}
                memberSinceIso={seller.created_at}
              />
            )}
          </div>
        </div>

        {/* Listings grid */}
        {loading ? (
          <p style={{ color: '#5b7a68', textAlign: 'center', padding: 40 }}>Loading…</p>
        ) : listings.length === 0 ? (
          <EmptyState
            tone="market"
            icon="🛍️"
            title={`@${seller?.username} doesn't have any active listings right now.`}
            action={(
              <Link href="/home-goods" style={{
                color: 'var(--brand-market)', fontWeight: 800, textDecoration: 'none',
              }}>
                Browse the full marketplace →
              </Link>
            )}
          />
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

        {/* Recently sold archive — trust signal showing the seller has
            actually completed transactions. Up to 8 most recent. */}
        {!loading && recentlySold.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{
              margin: '0 0 12px',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              color: 'var(--brand-market-text-mid)',
            }}>
              ✅ Recently sold
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 14,
              opacity: 0.85,
            }}>
              {recentlySold.map((l) => (
                <HomeGoodsListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
