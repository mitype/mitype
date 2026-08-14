'use client';
// /brand-deals — Browse open brand deals.
//
// Any signed-in member can browse (encourages non-subscribers to sign
// up). The subscription paywall bites only when they try to APPLY on
// the detail page, or when a business owner tries to POST.
//
// Filters: category + location + budget bracket. Filtering is client-
// side against the loaded page since Phase 1 is unlikely to have more
// briefs than fit comfortably in a single query.

import { useEffect, useMemo, useState } from 'react';
import { FeatureInfoButton } from '../components/FeatureInfoButton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { liquidGlass } from '../lib/liquidGlass';

interface DealRow {
  id: string;
  title: string;
  description: string;
  creator_category: string | null;
  deliverables: string[];
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  location_type: 'remote' | 'local' | 'either';
  city: string | null;
  state: string | null;
  applications_count: number;
  created_at: string;
  business: {
    id: string;
    business_name: string;
    logo_url: string | null;
    category: string | null;
    owner_username: string | null;
  } | null;
}

const CATEGORY_OPTIONS = [
  'All',
  'Photographers',
  'Videographers',
  'Writers',
  'Illustrators',
  'Musicians',
  'Content Creators',
  'Podcasters',
  'Designers',
  'Actors',
];

const LOCATION_OPTIONS: Array<{ key: 'all' | 'remote' | 'local'; label: string }> = [
  { key: 'all',    label: 'Any location' },
  { key: 'remote', label: 'Remote' },
  { key: 'local',  label: 'Local' },
];

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'Negotiable';
  if (min != null && max != null) {
    if (min === max) return `$${(min / 100).toFixed(0)}`;
    return `$${(min / 100).toFixed(0)}–$${(max / 100).toFixed(0)}`;
  }
  if (max != null) return `Up to $${(max / 100).toFixed(0)}`;
  return `From $${((min ?? 0) / 100).toFixed(0)}`;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function BrandDealsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('All');
  const [location, setLocation] = useState<'all' | 'remote' | 'local'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      // Check subscription + business ownership in parallel with deal load.
      const [subRes, bizRes, dealsRes] = await Promise.all([
        supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('business_profiles').select('id').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('brand_deals')
          .select('id, title, description, creator_category, deliverables, budget_min_cents, budget_max_cents, location_type, city, state, applications_count, created_at, business_id')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(60),
      ]);

      const sub = subRes.data?.status;
      setIsSubscribed(sub === 'active' || sub === 'trialing');
      setHasBusiness(!!bizRes.data?.id);

      // Load business profile + owner username per deal for the card.
      const bizIds = Array.from(new Set((dealsRes.data ?? []).map((d: any) => d.business_id)));
      const [businessesRes] = bizIds.length
        ? await Promise.all([
            supabase
              .from('business_profiles')
              .select('id, business_name, logo_url, category, user_id')
              .in('id', bizIds),
          ])
        : [{ data: [] as any[] }];
      const ownerIds = Array.from(new Set((businessesRes.data ?? []).map((b: any) => b.user_id)));
      const ownersRes = ownerIds.length
        ? await supabase.from('profiles').select('user_id, username').in('user_id', ownerIds)
        : { data: [] as any[] };
      const ownerMap = new Map<string, string>(
        (ownersRes.data ?? []).map((p: any) => [p.user_id, p.username])
      );
      const bizMap = new Map<string, any>(
        (businessesRes.data ?? []).map((b: any) => [b.id, b])
      );

      setDeals(
        (dealsRes.data ?? []).map((d: any) => {
          const b = bizMap.get(d.business_id) ?? null;
          return {
            id: d.id,
            title: d.title,
            description: d.description,
            creator_category: d.creator_category,
            deliverables: d.deliverables ?? [],
            budget_min_cents: d.budget_min_cents,
            budget_max_cents: d.budget_max_cents,
            location_type: d.location_type,
            city: d.city,
            state: d.state,
            applications_count: d.applications_count ?? 0,
            created_at: d.created_at,
            business: b
              ? {
                  id: b.id,
                  business_name: b.business_name,
                  logo_url: b.logo_url,
                  category: b.category,
                  owner_username: ownerMap.get(b.user_id) ?? null,
                }
              : null,
          } as DealRow;
        })
      );
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => {
    let base = deals;
    if (category !== 'All')       base = base.filter((d) => d.creator_category === category);
    if (location === 'remote')    base = base.filter((d) => d.location_type === 'remote' || d.location_type === 'either');
    if (location === 'local')     base = base.filter((d) => d.location_type === 'local'  || d.location_type === 'either');
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      (d.business?.business_name.toLowerCase().includes(q) ?? false)
    );
  }, [deals, category, location, query]);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/dashboard" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
        {/* Header */}
        <p style={{
          fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)',
          textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6,
        }}>
          Marketplace
        </p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, color: 'var(--brand-text-primary)',
          letterSpacing: '-0.8px', marginBottom: 8,
        }}>
          Brand Deals
        </h1>
        <p style={{
          color: 'var(--brand-personal-text-mid)', fontSize: 14, lineHeight: 1.5,
          marginBottom: 20, maxWidth: 640,
        }}>
          Paid briefs from Mitype small businesses. Subscribed creators can apply directly. The business will reach out through your inbox.
        </p>

        {/* Business owner CTA */}
        {hasBusiness && (
          <Link
            href={isSubscribed ? '/brand-deals/new' : '/subscription'}
            style={{
              ...liquidGlass({ tone: 'warm' }),
              display: 'inline-block',
              padding: '10px 22px',
              color: 'var(--brand-text-primary)',
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
              marginBottom: 24,
            }}
          >
            {isSubscribed ? 'Post a brand deal' : 'Subscribe to post a brand deal'}
          </Link>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12,
        }}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            style={{
              padding: '10px 14px', border: '1px solid rgba(200,149,108,0.25)',
              borderRadius: 100, background: 'white', fontSize: 14,
              fontFamily: 'inherit', color: 'var(--brand-text-primary)',
            }}
          >
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value as any)}
            aria-label="Filter by location"
            style={{
              padding: '10px 14px', border: '1px solid rgba(200,149,108,0.25)',
              borderRadius: 100, background: 'white', fontSize: 14,
              fontFamily: 'inherit', color: 'var(--brand-text-primary)',
            }}
          >
            {LOCATION_OPTIONS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>

        <input
          type="search"
          placeholder="Search deals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px',
            border: '1px solid rgba(200,149,108,0.25)',
            borderRadius: 12, fontSize: 16, background: 'white',
            color: 'var(--brand-text-primary)', outline: 'none',
            marginBottom: 20, boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />

        {/* Results */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--brand-personal)', padding: '48px 0' }}>Loading deals…</p>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '48px 20px', textAlign: 'center',
            background: 'white', border: '1px solid rgba(200,149,108,0.15)',
            borderRadius: 16, color: 'var(--brand-personal-text-light)', fontSize: 14,
          }}>
            No open brand deals match your filters right now. Check back soon.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((d) => (
              <Link
                key={d.id}
                href={`/brand-deals/${d.id}`}
                style={{
                  ...liquidGlass({ tone: 'clear', radius: 16, variant: 'lite' }),
                  display: 'block',
                  padding: '16px 18px',
                  textDecoration: 'none',
                  color: 'var(--brand-text-primary)',
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {/* Business logo */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, overflow: 'hidden',
                    background: 'var(--brand-personal-bg-pale)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {d.business?.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.business.logo_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 22 }} aria-hidden="true">🏪</span>
                    )}
                  </div>
                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 12, fontWeight: 700,
                      color: 'var(--brand-personal-text-light)',
                      margin: '0 0 2px',
                    }}>
                      {d.business?.business_name ?? 'Business'}
                    </p>
                    <h3 style={{
                      fontSize: 16, fontWeight: 800,
                      color: 'var(--brand-text-primary)', margin: '0 0 6px',
                      letterSpacing: '-0.2px', lineHeight: 1.3,
                    }}>
                      {d.title}
                    </h3>
                    <p style={{
                      fontSize: 13, color: 'var(--brand-personal-text-mid)',
                      margin: '0 0 10px', lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {d.description}
                    </p>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 6,
                      fontSize: 11, fontWeight: 700,
                    }}>
                      <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(200,149,108,0.12)', color: 'var(--brand-personal)' }}>
                        {formatBudget(d.budget_min_cents, d.budget_max_cents)}
                      </span>
                      {d.creator_category && (
                        <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(56,189,248,0.12)', color: '#0369a1' }}>
                          {d.creator_category}
                        </span>
                      )}
                      <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(21,128,61,0.12)', color: 'var(--brand-market)' }}>
                        {d.location_type === 'remote' ? 'Remote' : d.location_type === 'local' ? `${d.city ?? 'Local'}` : 'Remote or local'}
                      </span>
                      <span style={{ padding: '3px 9px', borderRadius: 100, background: 'rgba(0,0,0,0.05)', color: 'var(--brand-personal-text-light)' }}>
                        {d.applications_count} applicant{d.applications_count === 1 ? '' : 's'}
                      </span>
                      <span style={{ marginLeft: 'auto', color: 'var(--brand-personal-text-light)', fontWeight: 500 }}>
                        {timeAgo(d.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
          <FeatureInfoButton featureKey="brandDeals" />
    </main>
  );
}
