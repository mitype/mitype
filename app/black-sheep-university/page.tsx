'use client';
// /black-sheep-university - Masterclass hub.
//
// Subscriber-only. Lists every live masterclass (one per social
// platform). Only YouTube is built right now, so that's the only
// card shown; a simple note underneath says more are coming rather
// than previewing specific unbuilt platforms with no ETA.
//
// Hard paywall gate matches every other gated page on the site: no
// active/trialing subscription -> bounced to /subscription.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { FeatureInfoButton } from '../components/FeatureInfoButton';

interface Masterclass {
  slug: string;
  name: string;
  tagline: string;
  color: string;
  bg: string;
  available: boolean;
  badge: React.ReactNode;
}

function YouTubeBadge({ color }: { color: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="10" width="44" height="28" rx="9" fill={color} />
      <path d="M20 17.5 L32 24 L20 30.5 Z" fill="white" />
    </svg>
  );
}

const MASTERCLASSES: Masterclass[] = [
  {
    slug: 'youtube',
    name: 'YouTube Masterclass',
    tagline: 'Equipment, content strategy, SEO, monetization, the Shop, growth, and brand deals.',
    color: '#CC0000',
    bg: 'rgba(204,0,0,0.07)',
    available: true,
    badge: <YouTubeBadge color="#CC0000" />,
  },
];

export default function BlackSheepUniversityPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);

      // Hard paywall gate. Black Sheep University is a subscriber-only
      // benefit; anyone without an active/trialing subscription is
      // bounced to /subscription before seeing any course content.
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      const subscribed = sub?.status === 'active' || sub?.status === 'trialing';
      if (!subscribed) {
        router.push('/subscription');
        return;
      }
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'var(--brand-personal-bg-cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <p style={{ color: 'var(--brand-personal)', fontSize: 18 }}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 100,
    }}>
      <SiteNav userId={userId} showBack backFallbackHref="/dashboard" />

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 0' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 130, margin: '0 auto 8px' }}>
            <Image
              src="/black-sheep-university/logo.png"
              alt="Black Sheep University"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <p style={{
            color: 'var(--brand-personal-text-light)',
            fontSize: 15,
            fontWeight: 600,
            maxWidth: 480,
            margin: '0 auto',
          }}>
            Masterclass-grade training for creators, included with your membership.
            One class per platform. Learn it here, take it everywhere.
          </p>
        </div>

        {/* Masterclass grid. Capped column width + centered so a
            single card (today) doesn't stretch awkwardly full-width;
            more cards later will simply wrap into the grid normally. */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 360px))',
          justifyContent: 'center',
          gap: 18,
        }}>
          {MASTERCLASSES.map((mc) => {
            const card = (
              <div
                style={{
                  background: 'white',
                  border: `1px solid ${mc.available ? 'rgba(200,149,108,0.2)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: 24,
                  padding: '26px 24px',
                  boxShadow: mc.available ? '0 8px 28px rgba(0,0,0,0.05)' : 'none',
                  opacity: mc.available ? 1 : 0.62,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  cursor: mc.available ? 'pointer' : 'default',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: mc.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: mc.color,
                }}>
                  {mc.badge}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'var(--brand-text-primary)',
                    marginBottom: 6,
                    letterSpacing: '-0.3px',
                  }}>
                    {mc.name}
                  </h3>
                  <p style={{
                    fontSize: 13.5,
                    color: 'var(--brand-personal-text-mid)',
                    lineHeight: 1.5,
                  }}>
                    {mc.tagline}
                  </p>
                </div>
                <div style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: mc.available ? mc.color : 'var(--brand-personal-text-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {mc.available ? 'Start learning →' : 'Coming soon'}
                </div>
              </div>
            );

            return mc.available ? (
              <Link key={mc.slug} href={`/black-sheep-university/${mc.slug}`} style={{ textDecoration: 'none' }}>
                {card}
              </Link>
            ) : (
              <div key={mc.slug}>{card}</div>
            );
          })}
        </div>

        {/* No other platform cards yet since there's no firm ETA on
            them - just a simple heads up that more are on the way. */}
        <p style={{
          textAlign: 'center',
          fontSize: 13.5,
          fontWeight: 700,
          color: 'var(--brand-personal-text-light)',
          marginTop: 22,
        }}>
          More masterclasses coming soon.
        </p>

        {/* Protection notice - sets expectations up front, matches the
            copy-protection actually enforced inside each masterclass. */}
        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--brand-personal-text-light)',
          marginTop: 36,
        }}>
          Black Sheep University content is for Mitype subscribers only and stays inside the app.
          Downloading, screen recording, or redistributing lessons is against the Mitype Terms of Service.
        </p>
      </div>

      <FeatureInfoButton featureKey="black_sheep_university" />
    </main>
  );
}
