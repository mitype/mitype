'use client';
// FeatureExplorer — the "Why Mitype" section on the landing page.
//
// Replaces the old 6-card sprawl with a tight clickable grid that covers
// every feature on the platform. Each card is small (title + one-line
// teaser); tapping it opens a modal with the full pitch. Lets us
// communicate breadth without taking up four screens of space.
//
// Brand tone per card: personal (bronze), business (purple), market (green).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { liquidGlass } from '../lib/liquidGlass';

export interface Feature {
  /** Optional emoji rendered as a small accent. Kept tiny so the card
   *  reads as professional, not toy-like. */
  icon: string;
  title: string;
  blurb: string;
  /** Long-form pitch shown in the modal. Optional bullet list for
   *  multi-point features (e.g. the Small Business one). */
  body: string;
  bullets?: string[];
  tone: 'personal' | 'business' | 'market';
}

const TONE_COLOR: Record<Feature['tone'], { accent: string; border: string; tag: string }> = {
  personal: {
    accent: 'var(--brand-personal)',
    border: 'rgba(200,149,108,0.22)',
    tag: 'For creators',
  },
  business: {
    accent: 'var(--brand-business)',
    border: 'rgba(139,92,246,0.22)',
    tag: 'For small businesses',
  },
  market: {
    accent: 'var(--brand-market)',
    border: 'rgba(21,128,61,0.22)',
    tag: 'Mi Home Goods',
  },
};

interface Props {
  features: Feature[];
}

export function FeatureExplorer({ features }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenIndex(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex]);

  const open = openIndex !== null ? features[openIndex] : null;

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}>
        {features.map((f, i) => {
          const tone = TONE_COLOR[f.tone];
          return (
            <button
              key={f.title}
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`Learn more about ${f.title}`}
              style={{
                // `lite` variant — 14 tiles + they sit in the scroll
                // path, so backdrop-filter would tank scroll perf.
                // Same look, zero GPU cost.
                ...liquidGlass({ tone: 'clear', radius: 14, variant: 'lite' }),
                // Preserve the tone-color accent stripe on top; the
                // glass helper's transparent border already wraps the
                // other three sides.
                borderTop: `3px solid ${tone.accent}`,
                padding: '16px 16px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                minHeight: 100,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--brand-text-primary)',
                letterSpacing: '-0.2px',
                lineHeight: 1.2,
              }}>
                <span aria-hidden="true" style={{ fontSize: 16 }}>{f.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{f.title}</span>
              </div>
              <p style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--brand-personal-text-mid)',
                lineHeight: 1.4,
                flex: 1,
              }}>
                {f.blurb}
              </p>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: tone.accent,
                letterSpacing: '0.3px',
              }}>
                Learn more →
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={() => setOpenIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 16,
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: 'min(92vh, 800px)',
              background: 'linear-gradient(180deg, #fff9f2 0%, var(--brand-personal-bg-peach) 100%)',
              borderRadius: 24,
              boxShadow: '0 32px 70px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '22px 24px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              borderBottom: '1px solid rgba(200,149,108,0.18)',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  background: TONE_COLOR[open.tone].accent,
                  borderRadius: 100,
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  {TONE_COLOR[open.tone].tag}
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 900,
                  color: 'var(--brand-text-primary)',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <span aria-hidden="true">{open.icon}</span>
                  {open.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.06)',
                  border: 'none',
                  color: 'var(--brand-text-primary)',
                  fontSize: 16,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 24px',
            }}>
              <p style={{
                margin: 0,
                fontSize: 15,
                color: 'var(--brand-personal-text-deep)',
                lineHeight: 1.6,
              }}>
                {open.body}
              </p>
              {open.bullets && open.bullets.length > 0 && (
                <ul style={{
                  marginTop: 16,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  {open.bullets.map((b, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: 12,
                        background: 'white',
                        border: '1px solid rgba(200,149,108,0.18)',
                        borderRadius: 12,
                        fontSize: 14,
                        color: 'var(--brand-personal-text-deep)',
                        lineHeight: 1.5,
                      }}
                    >
                      <span aria-hidden="true" style={{
                        color: TONE_COLOR[open.tone].accent,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}>›</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{
              padding: '14px 24px 20px',
              borderTop: '1px solid rgba(200,149,108,0.18)',
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}>
              <Link
                href="/signup"
                onClick={() => setOpenIndex(null)}
                style={{
                  ...liquidGlass({ tone: 'warm' }),
                  flex: '1 1 220px',
                  padding: '13px 22px',
                  color: 'var(--brand-text-primary)',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  textAlign: 'center',
                  letterSpacing: '0.3px',
                }}
              >
                Create a profile →
              </Link>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                style={{
                  ...liquidGlass({ tone: 'clear' }),
                  padding: '13px 22px',
                  color: 'var(--brand-personal-text-mid)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
