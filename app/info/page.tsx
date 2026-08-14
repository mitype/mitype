'use client';
// /info — Information Center.
// Lists every feature on Mitype. Each card expands to reveal a full
// breakdown of how the feature works, why it was built, and how users
// can use it to network their creativity or find opportunities.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { liquidGlass } from '../lib/liquidGlass';
import { FEATURE_DESCRIPTIONS, type FeatureDescription } from '../lib/featureDescriptions';

// Grouped so the Information Center reads as sections instead of one
// giant list. Order is intentional: what you do first, what you do
// after, what you keep doing.
const GROUPS: Array<{ label: string; keys: Array<keyof typeof FEATURE_DESCRIPTIONS> }> = [
  { label: 'Start here',            keys: ['dashboard', 'editProfile', 'profile', 'discover'] },
  { label: 'Create and share',      keys: ['wave', 'currents', 'spotlight'] },
  { label: 'Connect and message',   keys: ['messages', 'rooms'] },
  { label: 'Network your creativity', keys: ['collab', 'meetups', 'projects'] },
  { label: 'Find opportunities',    keys: ['brandDeals'] },
  { label: 'For small businesses',  keys: ['businesses'] },
  { label: 'Buy and sell',          keys: ['homeGoods'] },
];

const TONES: Partial<Record<keyof typeof FEATURE_DESCRIPTIONS, string>> = {
  wave: '#38bdf8',
  currents: '#1e3a8a',
  brandDeals: 'var(--brand-business)',
  businesses: 'var(--brand-business)',
  homeGoods: 'var(--brand-market)',
  meetups: 'var(--brand-market)',
};

export default function InfoCenterPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, []);

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 100,
    }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/dashboard" />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{
          fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)',
          textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6,
        }}>
          Reference
        </p>
        <h1 style={{
          fontSize: 34, fontWeight: 900, color: 'var(--brand-text-primary)',
          letterSpacing: '-0.8px', marginBottom: 10,
        }}>
          Information Center
        </h1>
        <p style={{
          color: 'var(--brand-personal-text-mid)',
          fontSize: 15, lineHeight: 1.55, marginBottom: 32, maxWidth: 640,
        }}>
          Every feature on Mitype, explained. Tap any card to expand a full breakdown of how it works, why it exists, and how to use it to network your creativity or find opportunities. Come back any time.
        </p>

        {GROUPS.map((group) => (
          <section key={group.label} style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)',
              textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 12,
            }}>
              {group.label}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.keys.map((k) => {
                const d: FeatureDescription | undefined = FEATURE_DESCRIPTIONS[k];
                if (!d) return null;
                const open = openKey === d.key;
                const accent = TONES[k] ?? 'var(--brand-personal)';
                return (
                  <div
                    key={d.key}
                    style={{
                      ...liquidGlass({ tone: 'clear', radius: 16, variant: 'lite' }),
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenKey(open ? null : d.key)}
                      aria-expanded={open}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        padding: '14px 18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        position: 'relative',
                      }}
                    >
                      <span aria-hidden="true" style={{
                        position: 'absolute',
                        left: 0, top: 14, bottom: 14,
                        width: 3, borderRadius: 2, background: accent,
                      }} />
                      <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
                        <h3 style={{
                          fontSize: 15, fontWeight: 800,
                          color: 'var(--brand-text-primary)',
                          letterSpacing: '-0.2px', margin: 0,
                        }}>
                          {d.title}
                        </h3>
                        {!open && d.paragraphs[0] && (
                          <p style={{
                            fontSize: 13, color: 'var(--brand-personal-text-mid)',
                            margin: '4px 0 0', lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {d.paragraphs[0]}
                          </p>
                        )}
                      </div>
                      <span aria-hidden="true" style={{
                        fontSize: 18, fontWeight: 800, color: accent, flexShrink: 0,
                      }}>
                        {open ? '−' : '+'}
                      </span>
                    </button>

                    {open && (
                      <div style={{
                        padding: '4px 22px 20px',
                        borderTop: '1px solid rgba(200,149,108,0.15)',
                      }}>
                        {d.paragraphs.map((p, i) => (
                          <p key={i} style={{
                            color: 'var(--brand-text-primary)',
                            fontSize: 14, lineHeight: 1.65,
                            margin: '14px 0 0',
                          }}>
                            {p}
                          </p>
                        ))}
                        {d.bullets && d.bullets.length > 0 && (
                          <ul style={{
                            margin: '10px 0 0', paddingLeft: 20,
                            color: 'var(--brand-text-primary)',
                            fontSize: 14, lineHeight: 1.6,
                          }}>
                            {d.bullets.map((b, i) => (
                              <li key={i} style={{ marginBottom: 4 }}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <p style={{
          textAlign: 'center', fontSize: 12,
          color: 'var(--brand-personal-text-light)',
          marginTop: 20,
        }}>
          Look for the small (i) icon in the bottom-right of any page for the same breakdown of the feature you are currently using.
        </p>
      </div>
    </main>
  );
}
