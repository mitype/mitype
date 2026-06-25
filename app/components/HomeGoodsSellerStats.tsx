'use client';
// HomeGoodsSellerStats — small trust-signal card for Mi Home Goods.
//
// Used on the listing detail page and the seller's /by/[username] page.
// Surfaces the kind of signals buyers actually look at on used-goods
// marketplaces: how long they've been a member, how many listings
// they've posted, and how many they've successfully sold.
//
// Pure visual — does its own fetch on mount and renders nothing if the
// stats are still loading or unavailable (graceful fallback).

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Props {
  sellerId: string;
  /** Optional pre-fetched "member since" date so we skip one round-trip
   *  when the parent already loaded the seller profile. */
  memberSinceIso?: string | null;
}

interface Stats {
  active: number;
  sold: number;
  total: number;
}

export function HomeGoodsSellerStats({ sellerId, memberSinceIso }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(
    memberSinceIso ?? null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Counts via head queries so we don't pay for row payloads.
        const [activeRes, soldRes, totalRes] = await Promise.all([
          supabase
            .from('home_goods_listings')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', sellerId)
            .eq('status', 'active'),
          supabase
            .from('home_goods_listings')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', sellerId)
            .eq('status', 'sold'),
          supabase
            .from('home_goods_listings')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', sellerId),
        ]);
        if (cancelled) return;
        setStats({
          active: activeRes.count ?? 0,
          sold: soldRes.count ?? 0,
          total: totalRes.count ?? 0,
        });
        // If parent didn't already pass the member-since date, fetch it.
        if (!memberSinceIso) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('user_id', sellerId)
            .maybeSingle();
          if (!cancelled && prof?.created_at) setMemberSince(prof.created_at);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sellerId, memberSinceIso]);

  if (loading || !stats) return null;

  // Hide entirely when this is a brand-new seller with no posts AND no
  // member-since date — there's nothing to brag about yet.
  if (stats.total === 0 && !memberSince) return null;

  const memberSinceYear = memberSince ? new Date(memberSince).getFullYear() : null;

  return (
    <div
      role="group"
      aria-label="Seller trust signals"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
      }}
    >
      {memberSinceYear !== null && (
        <Pill icon="🌱" label={`Member since ${memberSinceYear}`} />
      )}
      {stats.active > 0 && (
        <Pill
          icon="🏷️"
          label={`${stats.active} active ${stats.active === 1 ? 'listing' : 'listings'}`}
        />
      )}
      {stats.sold > 0 && (
        <Pill
          icon="✅"
          label={`${stats.sold} sold`}
          highlight
        />
      )}
    </div>
  );
}

function Pill({ icon, label, highlight }: {
  icon: string; label: string; highlight?: boolean;
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 11px',
      borderRadius: 100,
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.1px',
      background: highlight ? 'rgba(21,128,61,0.12)' : 'white',
      color: highlight ? 'var(--brand-market-deep)' : 'var(--brand-market-text-mid)',
      border: `1px solid ${highlight ? 'rgba(21,128,61,0.35)' : 'rgba(21,128,61,0.22)'}`,
    }}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
