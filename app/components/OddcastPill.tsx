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
        {/* True Liquid Glass — Apple iOS 26 style.
            Key detail vs a plain "frosted pill":
              The border is NOT a solid color — it's a diagonal gradient
              that goes BRIGHT WHITE at the top-left corner, fades to
              nearly transparent through the middle, then BRIGHT WHITE
              again at the bottom-right corner. This is the two-point
              specular highlight that reads as "curved glass catching
              light" instead of "colored pill with a border."
            Effect stack:
              1. `background-clip: padding-box, border-box` trick →
                 padding-box gets the translucent tinted body, border-box
                 gets the diagonal-gradient shine border.
              2. `backdrop-filter: blur + saturate` → the see-through
                 glass distortion of whatever's behind it.
              3. Inset shadows → subtle inner depth (soft glow at
                 top-left, soft shadow at bottom-right, mirroring the
                 border light direction).
              4. Outer soft shadow → floats the pill above the page. */}
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
            padding: '11px 22px',
            fontSize: 13,
            color: 'var(--brand-text-primary)',
            fontWeight: 800,
            borderRadius: 100,
            cursor: 'pointer',
            fontFamily: 'inherit',
            // The gradient-border trick: TWO backgrounds stacked.
            //   1st layer (padding-box) = the tinted glass body
            //   2nd layer (border-box)  = the diagonal shine border
            // Border is 1.5px of transparent so the border-box layer
            // shows through only in the border ring.
            background: [
              'linear-gradient(135deg, rgba(255,240,220,0.45) 0%, rgba(255,225,200,0.20) 50%, rgba(255,240,220,0.40) 100%) padding-box',
              // The magic — a 135° gradient with bright stops at 0% and
              // 100% (the top-left and bottom-right corners of the pill).
              'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.15) 25%, rgba(200,149,108,0.20) 50%, rgba(255,255,255,0.15) 75%, rgba(255,255,255,0.95) 100%) border-box',
            ].join(', '),
            border: '1.5px solid transparent',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            // Inset shadows mirror the border light direction: a soft
            // white glow radiating IN from the top-left corner, a soft
            // shadow settling into the bottom-right. Combined with the
            // gradient border, this sells the 3D curved-glass feel.
            boxShadow: [
              'inset 2px 2px 6px rgba(255,255,255,0.35)',
              'inset -2px -2px 6px rgba(120,80,40,0.10)',
              hover
                ? '0 12px 32px rgba(200,149,108,0.28)'
                : '0 6px 22px rgba(200,149,108,0.20)',
            ].join(', '),
            transform: hover ? 'translateY(-1px) scale(1.02)' : 'none',
            transition:
              'transform 0.18s ease, box-shadow 0.18s ease',
            textShadow: '0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          ♾️ Oddcast
        </button>
      </div>

      <style>{`
        /* Fallback: browsers without backdrop-filter get a slightly opaque
           peach fill so the pill still reads as elevated. */
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .mitype-glass-pill {
            background: linear-gradient(135deg, #ffefd8 0%, #ffe1c8 100%) !important;
            border: 1.5px solid rgba(200,149,108,0.4) !important;
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
