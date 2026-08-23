'use client';
// /mi-referrals — CMO-only referral leaderboard.
//
// Shows every user whose profile has referred_by = this CMO. Displays
// their username, when they signed up, and their current subscription
// status. The CMO can only see subscription data for users they
// personally referred (enforced by an RLS policy on subscriptions);
// no other user's status is visible.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { Avatar } from '../components/Avatar';
import { FeatureInfoButton } from '../components/FeatureInfoButton';

interface RefRow {
  user_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  is_subscribed: boolean;
  subscription_status: string | null;
}

export default function MiReferralsPage() {
  const router = useRouter();
  const [gate, setGate] = useState<'checking' | 'ok'>('checking');
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<RefRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);

      // Gate: only CMOs can see this page.
      const { data: me } = await supabase
        .from('profiles')
        .select('is_cmo')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!me?.is_cmo) {
        router.replace('/dashboard');
        return;
      }

      // Load every profile the CMO has referred, then look up
      // subscription rows. RLS on subscriptions only returns rows
      // for users the CMO actually referred; anyone else stays hidden.
      const { data: refProfiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, created_at')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false });

      const ids = (refProfiles ?? []).map((p: any) => p.user_id);
      const subMap = new Map<string, string>();
      if (ids.length > 0) {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('user_id, status')
          .in('user_id', ids);
        (subs ?? []).forEach((s: any) => {
          if (s.user_id && s.status) subMap.set(s.user_id, s.status);
        });
      }

      setRows((refProfiles ?? []).map((p: any) => {
        const status = subMap.get(p.user_id) ?? null;
        const isSub = status === 'active' || status === 'trialing';
        return {
          user_id: p.user_id,
          username: p.username ?? 'unknown',
          avatar_url: p.avatar_url ?? null,
          created_at: p.created_at,
          is_subscribed: isSub,
          subscription_status: status,
        };
      }));
      setGate('ok');
    })();
  }, [router]);

  const subscribedCount = rows.filter((r) => r.is_subscribed).length;

  if (gate === 'checking') {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'var(--brand-personal-bg-cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <p style={{ color: 'var(--brand-personal)' }}>Loading Mi Referrals…</p>
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
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/dashboard" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{
          fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)',
          textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6,
        }}>
          CMO
        </p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, color: 'var(--brand-text-primary)',
          letterSpacing: '-0.8px', marginBottom: 10,
        }}>
          Mi Referrals
        </h1>
        <p style={{
          color: 'var(--brand-personal-text-mid)', fontSize: 14,
          lineHeight: 1.5, marginBottom: 20, maxWidth: 640,
        }}>
          Every profile created through your personal share link (mitypeapp.com/?ref=@yourhandle) shows up here along with their current subscription status. This is the only user data you have access to on the platform.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <span style={{
            padding: '8px 14px', borderRadius: 100,
            background: 'rgba(200,149,108,0.12)',
            color: 'var(--brand-personal)',
            fontSize: 13, fontWeight: 800,
          }}>
            {rows.length} referred
          </span>
          <span style={{
            padding: '8px 14px', borderRadius: 100,
            background: 'rgba(22,163,74,0.14)',
            color: 'var(--brand-market)',
            fontSize: 13, fontWeight: 800,
          }}>
            {subscribedCount} subscribed
          </span>
        </div>

        {rows.length === 0 ? (
          <div style={{
            padding: '48px 20px', textAlign: 'center',
            background: 'white', border: '1px solid rgba(200,149,108,0.15)',
            borderRadius: 16, color: 'var(--brand-personal-text-light)', fontSize: 14,
          }}>
            No referrals yet. Share your link (mitypeapp.com/?ref=@yourhandle) on your socials to start seeing signups here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((r) => (
              <Link
                key={r.user_id}
                href={`/profile/${r.username}`}
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
                    src={r.avatar_url}
                    alt={`@${r.username}`}
                    width={44}
                    height={44}
                    fallbackFontSize={20}
                    sizes="44px"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14, fontWeight: 800,
                    color: 'var(--brand-text-primary)',
                    margin: 0, letterSpacing: '-0.2px',
                  }}>
                    @{r.username}
                  </p>
                  <p style={{
                    fontSize: 12, color: 'var(--brand-personal-text-light)',
                    margin: '2px 0 0',
                  }}>
                    Joined {new Date(r.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  background: r.is_subscribed
                    ? 'rgba(22,163,74,0.12)'
                    : 'rgba(200,149,108,0.10)',
                  color: r.is_subscribed
                    ? 'var(--brand-market)'
                    : 'var(--brand-personal-text-light)',
                  flexShrink: 0,
                }}>
                  {r.is_subscribed
                    ? (r.subscription_status === 'trialing' ? 'Trial' : 'Subscribed')
                    : 'Not subscribed'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <FeatureInfoButton featureKey="miReferrals" />
    </main>
  );
}
