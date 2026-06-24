'use client';
// SmallBusinessInfoModal — quick info panel that opens from the
// landing page so a curious small-business owner can see, in a glance,
// how Mitype helps them. Self-contained, opens/closes via a single
// boolean prop. Designed to be short and skimmable, not a pitch deck.

import Link from 'next/link';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Benefit {
  icon: string;
  title: string;
  body: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: '🏪',
    title: 'Your own business profile',
    body: 'A clean page for your shop — logo, services, contact buttons, hours, links, and events. Free to set up.',
  },
  {
    icon: '📍',
    title: 'Discoverable in your zip code',
    body: 'When Mitype members in your area open Discover, your business shows up in the local list — filterable by category.',
  },
  {
    icon: '✨',
    title: 'Daily Business Spotlight',
    body: 'Every day one small business gets a hero card on Discover seen by every member. Free exposure on rotation.',
  },
  {
    icon: '💜',
    title: 'Customer recommendations',
    body: 'Your existing connections can recommend your business right on their own profile — word-of-mouth, made visible.',
  },
  {
    icon: '🌐',
    title: 'Online-only? Totally fine',
    body: 'Etsy, Shopify, custom clothing, e-books, online courses — pick from 130+ business types, no storefront required.',
  },
  {
    icon: '💬',
    title: 'Direct messages from real members',
    body: 'Interested members can message you straight from your business page. No DM spam, no bot inbox.',
  },
];

export function SmallBusinessInfoModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How Mitype helps small businesses"
      onClick={onClose}
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
          maxWidth: 540,
          maxHeight: 'min(92vh, 820px)',
          background: 'linear-gradient(180deg, #fff9f2 0%, #fff3ec 100%)',
          borderRadius: 28,
          boxShadow: '0 32px 70px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 26px 14px',
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
              gap: 8,
              padding: '4px 11px',
              background: 'linear-gradient(135deg, #8b5cf6, #c084fc)',
              borderRadius: 100,
              color: 'white',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              <span aria-hidden="true">🏪</span> For small businesses
            </div>
            <h2 style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 900,
              color: '#1a1208',
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
            }}>
              Built for owners, side-hustlers, and online shops
            </h2>
            <p style={{
              margin: '6px 0 0',
              fontSize: 13,
              color: '#7a6a4f',
              lineHeight: 1.5,
            }}>
              Six ways Mitype puts your business in front of the right people.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)',
              border: 'none',
              color: '#1a1208',
              fontSize: 17,
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Benefits list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 14,
                padding: 14,
                background: 'white',
                border: '1px solid rgba(200,149,108,0.18)',
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(200,149,108,0.06)',
              }}
            >
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #fff3ec, #ffe1c8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}>
                {b.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#1a1208',
                  letterSpacing: '-0.2px',
                  marginBottom: 3,
                }}>
                  {b.title}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#5b4a36',
                  lineHeight: 1.5,
                }}>
                  {b.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div style={{
          padding: '16px 26px 22px',
          borderTop: '1px solid rgba(200,149,108,0.18)',
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <Link
            href="/signup"
            onClick={onClose}
            style={{
              flex: '1 1 220px',
              padding: '14px 22px',
              background: 'linear-gradient(135deg, #c8956c, #ffb37c)',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 10px 24px rgba(200,149,108,0.4)',
              letterSpacing: '0.3px',
            }}
          >
            Start your business profile →
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '14px 22px',
              background: 'transparent',
              color: '#8a7560',
              border: '1px solid rgba(200,149,108,0.35)',
              borderRadius: 100,
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
  );
}
