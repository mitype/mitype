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

interface SellerProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, city, state')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      if (!profile) {
        router.push('/home-goods');
        return;
      }
      setSeller(profile as SellerProfile);

      const { data: rows } = await supabase
        .from('home_goods_listings')
        .select('id, title, price_cents, price_kind, category, photo_urls, city, state, status, created_at')
        .eq('seller_id', profile.user_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(120);
      setListings((rows ?? []) as HomeGoodsListingLite[]);
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
          </div>
        </div>

        {/* Listings grid */}
        {loading ? (
          <p style={{ color: '#5b7a68', textAlign: 'center', padding: 40 }}>Loading…</p>
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
            <div style={{ fontSize: 38, marginBottom: 8 }}>🛍️</div>
            <p style={{ margin: 0 }}>
              @{seller?.username} doesn&apos;t have any active listings right now.
            </p>
            <Link href="/home-goods" style={{
              display: 'inline-block', marginTop: 12,
              color: 'var(--brand-market)', fontWeight: 800, textDecoration: 'none',
            }}>
              Browse the full marketplace →
            </Link>
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
