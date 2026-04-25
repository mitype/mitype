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
        <button
          type="button"
          onClick={() => setOpen(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label="Learn more about Oddcast"
          aria-haspopup="dialog"
          aria-expanded={open}
          style={{
            // Match the size of the regular category pills (padding + fontSize)
            // but keep the gradient, border, shadow, and hover lift so this
            // one still reads as the "featured" pill.
            background: 'linear-gradient(135deg, #fff3ec 0%, #ffe1c8 100%)',
            border: '1.5px solid rgba(200,149,108,0.45)',
            borderRadius: 100,
            padding: '9px 18px',
            fontSize: 13,
            color: '#1a1208',
            fontWeight: 800,
            boxShadow: hover
              ? '0 4px 14px rgba(200,149,108,0.25)'
              : '0 2px 8px rgba(200,149,108,0.15)',
            cursor: 'pointer',
            transform: hover ? 'translateY(-1px)' : 'none',
            transition:
              'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
            fontFamily: 'inherit',
          }}
        >
          ♾️ Oddcast
        </button>
      </div>

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
                'linear-gradient(180deg, #fff8ec 0%, #fff3ec 100%)',
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
                color: '#8a7560',
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
                color: '#c8956c',
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
                color: '#c8956c',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.5px',
                margin: 0,
                textAlign: 'right',
              }}
            >
              — stay odd
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
