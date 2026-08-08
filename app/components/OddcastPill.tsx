'use client';
// Featured "Oddcast" pill on the landing page. Clicking it opens a modal
// describing what the category is about. The pill itself is the only thing
// on its row — it sits above the main category flex-wrap to feel elevated.
//
// The pill must be a client component because it owns modal open state +
// keyboard / outside-click handlers. The rest of the landing page stays a
// server component.

import { useEffect, useState } from 'react';

export function OddcastPill() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);

  // Close on Escape; lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        {/* Liquid Glass pill — Apple iOS 26 style.
            Layered effect breakdown:
              1. `backdrop-filter: blur + saturate` → the see-through glass.
              2. Multi-stop linear-gradient background → refractive tint that
                 picks up the warm cream color of the page beneath.
              3. Inset white highlight on top edge (`inset 0 1px 0 ...`) +
                 inset dark under-shadow on bottom edge → the "curved glass"
                 illusion.
              4. Outer box-shadow → the soft floating look above the page.
              5. Animated shimmer sweep → the "living light" that makes glass
                 feel alive. Pauses on reduced motion.
            Fallback: on browsers without backdrop-filter support we get a
            slightly opaque peach background instead, which still reads as
            elevated. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label="Learn more about Oddcast"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="mitype-glass-pill"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '11px 22px',
            fontSize: 13,
            color: 'var(--brand-text-primary)',
            fontWeight: 800,
            borderRadius: 100,
            cursor: 'pointer',
            fontFamily: 'inherit',
            // Layered background: soft warm tint on top of the blur.
            background:
              'linear-gradient(135deg, rgba(255,240,220,0.55) 0%, rgba(255,225,200,0.30) 45%, rgba(255,240,220,0.50) 100%)',
            // Hair-thin border in a semi-transparent bronze so it doesn't
            // look painted on top — it feels like the edge of the glass.
            border: '1px solid rgba(200,149,108,0.35)',
            // Backdrop filter = the actual "glass" — blurs whatever's behind
            // the button and saturates the color a hair so warmth pops.
            backdropFilter: 'blur(14px) saturate(160%)',
            WebkitBackdropFilter: 'blur(14px) saturate(160%)',
            // Combined shadows:
            //   - inset top-white → the highlight along the top curve
            //   - inset bottom-dark → the shadow along the bottom curve
            //   - outer bronze glow → floats the pill above the page
            boxShadow: [
              'inset 0 1px 0 rgba(255,255,255,0.75)',
              'inset 0 -1px 1px rgba(120,80,40,0.10)',
              hover
                ? '0 10px 28px rgba(200,149,108,0.30)'
                : '0 6px 20px rgba(200,149,108,0.22)',
            ].join(', '),
            transform: hover ? 'translateY(-1px) scale(1.02)' : 'none',
            transition:
              'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
            // Slight text shadow to keep the label readable against the
            // translucent surface without darkening the button.
            textShadow: '0 1px 0 rgba(255,255,255,0.55)',
          }}
        >
          <span style={{ position: 'relative', zIndex: 2 }}>
            ♾️ Oddcast
          </span>
          {/* Animated shimmer — a soft diagonal white streak that sweeps
              across the pill every ~5s. This is what makes it feel alive. */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 100,
              background:
                'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)',
              transform: 'translateX(-100%)',
              animation: 'mitype-glass-shimmer 5.5s ease-in-out infinite',
              pointerEvents: 'none',
              mixBlendMode: 'overlay',
              zIndex: 1,
            }}
          />
        </button>
      </div>

      <style>{`
        @keyframes mitype-glass-shimmer {
          0%   { transform: translateX(-100%); }
          55%  { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mitype-glass-pill > span[aria-hidden="true"] { animation: none; opacity: 0; }
        }
        /* Fallback: browsers without backdrop-filter get a slightly opaque
           peach fill so the pill still reads as elevated. */
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .mitype-glass-pill {
            background: linear-gradient(135deg, #ffefd8 0%, #ffe1c8 100%) !important;
          }
        }
      `}</style>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="oddcast-modal-title"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,18,8,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
            animation: 'mitype-oddcast-fade 0.18s ease-out',
          }}
        >
          <div
            // Stop clicks on the card itself from bubbling up and closing.
            onClick={(e) => e.stopPropagation()}
            style={{
              background:
                'linear-gradient(180deg, var(--brand-personal-bg-peach-warm) 0%, var(--brand-personal-bg-peach) 100%)',
              border: '1px solid rgba(200,149,108,0.3)',
              borderRadius: 28,
              maxWidth: 480,
              width: '100%',
              padding: '36px 32px 32px',
              position: 'relative',
              boxShadow: '0 24px 60px rgba(26,18,8,0.35)',
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(200,149,108,0.12)',
                color: 'var(--brand-personal-text-mid)',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                fontFamily: 'inherit',
              }}
            >
              ×
            </button>

            <p
              style={{
                color: 'var(--brand-personal)',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                margin: '0 0 14px',
              }}
            >
              ♾️ Oddcast
            </p>

            <p
              id="oddcast-modal-title"
              style={{
                color: '#3d2e1f',
                fontSize: 18,
                lineHeight: 1.5,
                margin: '0 0 14px',
                fontStyle: 'italic',
                fontWeight: 600,
              }}
            >
              &ldquo;Become who you needed when you needed somebody.&rdquo;
            </p>

            <p
              style={{
                color: 'var(--brand-personal)',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.5px',
                margin: 0,
                textAlign: 'right',
              }}
            >
             . Stay odd
            </p>
          </div>

          {/* Tiny inline keyframe for the fade-in. Scoped to the modal only. */}
          <style>{`
            @keyframes mitype-oddcast-fade {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
