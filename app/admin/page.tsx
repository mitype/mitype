'use client';
// /admin — Admin Control Center.
//
// Restricted to users with `profiles.is_admin = true`. Non-admins hitting
// this URL get redirected straight to /dashboard so the page acts as if
// it doesn't exist. Admins see a control panel with:
//   * Three tabs: All users / Subscribed / Unsubscribed
//   * Per-tab search box
//   * Total row count per tab
//   * Each row: avatar, @username, joined date, subscription status pill,
//     click-through to that user's public profile
//
// Data model:
//   Load ALL profiles + ALL active/trialing subscriptions in one page
//   load, join in memory, then filter/search client-side. Fast enough
//   for tens of thousands of users; if we ever cross that we'll
//   paginate.

import { useEffect, useMemo, useState } from 'react';
import { FeatureInfoButton } from '../components/FeatureInfoButton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { Avatar } from '../components/Avatar';

type Tab = 'all' | 'subscribed' | 'unsubscribed' | 'founders50' | 'referrals';

interface UserRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
  is_subscribed: boolean;
  subscription_status: string | null;
  founders_50_opted_in: boolean;
  referred_by: string | null;
  referred_by_username?: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [gateChecking, setGateChecking] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      // ---- Gate ----
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data: me } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!me?.is_admin) {
        router.replace('/dashboard');
        return;
      }

      // ---- Load all profiles + subscriptions in parallel ----
      const [profRes, subRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, username, avatar_url, created_at, is_admin, founders_50_opted_in, referred_by')
          .order('created_at', { ascending: false }),
        supabase
          .from('subscriptions')
          .select('user_id, status'),
      ]);

      const subMap = new Map<string, string>();
      (subRes.data ?? []).forEach((s: any) => {
        if (s.user_id && s.status) subMap.set(s.user_id, s.status);
      });

      const rows: UserRow[] = (profRes.data ?? []).map((p: any) => {
        const status = subMap.get(p.user_id) ?? null;
        const isSub = status === 'active' || status === 'trialing';
        return {
          user_id: p.user_id,
          username: p.username ?? 'unknown',
          avatar_url: p.avatar_url ?? null,
          created_at: p.created_at,
          is_admin: !!p.is_admin,
          is_subscribed: isSub,
          subscription_status: status,
          founders_50_opted_in: !!p.founders_50_opted_in,
          referred_by: p.referred_by ?? null,
        };
      });

      // Second pass: attach the referrer's @username to each row that
      // has a referred_by set, so the Referrals tab can show
      // "@newuser referred by @jensrealitea" at a glance.
      const usernameByUserId = new Map<string, string>(
        rows.map((u) => [u.user_id, u.username])
      );
      for (const u of rows) {
        if (u.referred_by) {
          u.referred_by_username = usernameByUserId.get(u.referred_by) ?? null;
        }
      }

      setUsers(rows);
      setGateChecking(false);
    })();
  }, [router]);

  // Filter + search — memoized so retyping doesn't re-scan on every keystroke.
  const filtered = useMemo(() => {
    let base = users;
    if (tab === 'subscribed')   base = users.filter((u) => u.is_subscribed);
    if (tab === 'unsubscribed') base = users.filter((u) => !u.is_subscribed);
    if (tab === 'founders50')   base = users.filter((u) => u.founders_50_opted_in);
    if (tab === 'referrals')    base = users.filter((u) => !!u.referred_by);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((u) => u.username.toLowerCase().includes(q));
  }, [users, tab, query]);

  // Per-tab totals — always computed against the full set (not the query
  // filter) so the numbers reflect the true population.
  const counts = useMemo(() => ({
    all: users.length,
    subscribed: users.filter((u) => u.is_subscribed).length,
    unsubscribed: users.filter((u) => !u.is_subscribed).length,
    founders50: users.filter((u) => u.founders_50_opted_in).length,
    referrals: users.filter((u) => !!u.referred_by).length,
  }), [users]);

  if (gateChecking) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'var(--brand-personal-bg-cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <p style={{ color: 'var(--brand-personal)', fontSize: 16 }}>Loading admin panel…</p>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>
      <SiteNav userId={undefined} showBack backFallbackHref="/dashboard" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <p style={{
          fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)',
          textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6,
        }}>
          Admin Control Center
        </p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, color: 'var(--brand-text-primary)',
          letterSpacing: '-0.8px', marginBottom: 24,
        }}>
          Users
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {(['all', 'subscribed', 'unsubscribed', 'founders50', 'referrals'] as const).map((t) => {
            const active = tab === t;
            const label =
              t === 'all' ? 'All' :
              t === 'subscribed' ? 'Subscribed' :
              t === 'unsubscribed' ? 'Unsubscribed' :
              t === 'founders50' ? 'Founders 50' : 'Referrals';
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: '9px 18px',
                  background: active ? 'var(--brand-personal)' : 'white',
                  color: active ? 'white' : 'var(--brand-personal-text-mid)',
                  border: `1px solid ${active ? 'var(--brand-personal)' : 'rgba(200,149,108,0.25)'}`,
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {label} <span style={{ opacity: 0.7, marginLeft: 4 }}>({counts[t]})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search by @username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid rgba(200,149,108,0.25)',
            borderRadius: 12,
            fontSize: 16,  // 16px+ prevents iOS zoom on focus
            background: 'white',
            color: 'var(--brand-text-primary)',
            outline: 'none',
            marginBottom: 20,
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />

        {/* Results */}
        {filtered.length === 0 ? (
          <div style={{
            padding: '32px 20px',
            textAlign: 'center',
            background: 'white',
            border: '1px solid rgba(200,149,108,0.15)',
            borderRadius: 16,
            color: 'var(--brand-personal-text-light)',
            fontSize: 14,
          }}>
            No users match this filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((u) => (
              <Link
                key={u.user_id}
                href={`/profile/${u.username}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  background: 'white',
                  border: '1px solid rgba(200,149,108,0.18)',
                  borderRadius: 14,
                  textDecoration: 'none',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                  flexShrink: 0, background: 'var(--brand-personal-bg-pale)',
                }}>
                  <Avatar
                    src={u.avatar_url}
                    alt={`@${u.username}`}
                    width={44}
                    height={44}
                    fallbackFontSize={20}
                    sizes="44px"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14, fontWeight: 800, color: 'var(--brand-text-primary)',
                    margin: 0, letterSpacing: '-0.2px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    @{u.username}
                    {u.is_admin && (
                      <span style={{
                        marginLeft: 8, padding: '1px 6px',
                        fontSize: 9, fontWeight: 900, letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                        background: 'var(--brand-personal)', color: 'white',
                        borderRadius: 100,
                      }}>
                        Admin
                      </span>
                    )}
                  </p>
                  <p style={{
                    fontSize: 12, color: 'var(--brand-personal-text-light)',
                    margin: '2px 0 0',
                  }}>
                    Joined {new Date(u.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                    {u.referred_by_username && (
                      <span style={{ marginLeft: 8, color: 'var(--brand-personal)', fontWeight: 700 }}>
                        · Referred by @{u.referred_by_username}
                      </span>
                    )}
                  </p>
                </div>
                {/* Status pills: Founders 50 + subscription. Stacked
                    vertically to fit on narrow screens. */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  alignItems: 'flex-end', flexShrink: 0,
                }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase',
                    background: u.is_subscribed
                      ? 'rgba(22,163,74,0.12)'
                      : 'rgba(200,149,108,0.10)',
                    color: u.is_subscribed
                      ? 'var(--brand-market)'
                      : 'var(--brand-personal-text-light)',
                    whiteSpace: 'nowrap',
                  }}>
                    {u.is_subscribed
                      ? (u.subscription_status === 'trialing' ? 'Trial' : 'Active')
                      : 'None'}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 100,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase',
                    background: u.founders_50_opted_in
                      ? 'rgba(200,149,108,0.15)'
                      : 'rgba(200,149,108,0.06)',
                    color: u.founders_50_opted_in
                      ? 'var(--brand-personal)'
                      : 'var(--brand-personal-text-light)',
                    whiteSpace: 'nowrap',
                  }}>
                    F50: {u.founders_50_opted_in ? 'In' : 'Out'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
          <FeatureInfoButton featureKey="admin" />
    </main>
  );
}
