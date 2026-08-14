'use client';
// Universal "how does this feature work?" info button.
//
// A small (i) icon fixed to the bottom-right of the viewport. Tapping
// it opens a modal with a full description of the current feature.
// Every major page renders one of these so users always have a
// reference explaining what the surface they are on does.
//
// Usage: drop <FeatureInfoButton featureKey="wave" /> anywhere on the
// page. The featureKey looks up the description from
// app/lib/featureDescriptions.tsx.
//
// Copy in featureDescriptions.tsx uses no em-dashes per user request.

import { useEffect, useState } from 'react';
import { FEATURE_DESCRIPTIONS, type FeatureDescription } from '../lib/featureDescriptions';

interface Props {
  featureKey: keyof typeof FEATURE_DESCRIPTIONS;
  /** Optional bottom offset override in pixels. Default 20. Use to
   *  clear the iPhone home indicator on feeds that already have their
   *  own bottom UI. */
  bottomOffset?: number;
}

export function FeatureInfoButton({ featureKey, bottomOffset = 20 }: Props) {
  const [open, setOpen] = useState(false);
  const desc: FeatureDescription | undefined = FEATURE_DESCRIPTIONS[featureKey];

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!desc) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`How ${desc.title} works`}
        title={`About ${desc.title}`}
        style={{
          position: 'fixed',
          bottom: `calc(max(${bottomOffset}px, env(safe-area-inset-bottom)) + 10px)`,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1.5px solid var(--brand-personal)',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: 'var(--brand-personal)',
          fontSize: 20,
          fontWeight: 900,
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          cursor: 'pointer',
          zIndex: 90,
          boxShadow: '0 6px 20px rgba(200,149,108,0.30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
        }}
      >
        i
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`feature-info-title-${desc.key}`}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,18,8,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
            animation: 'mitype-feature-info-fade 0.18s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #fff9f2 0%, var(--brand-personal-bg-peach) 100%)',
              border: '1px solid rgba(200,149,108,0.3)',
              borderRadius: 24,
              maxWidth: 520,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '32px 28px 28px',
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
                width: 32,
                height: 32,
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
                padding: 0,
              }}
            >
              ×
            </button>

            <p style={{
              fontSize: 11,
              fontWeight: 900,
              color: 'var(--brand-personal)',
              textTransform: 'uppercase',
              letterSpacing: '1.6px',
              margin: '0 0 8px',
            }}>
              How it works
            </p>

            <h2
              id={`feature-info-title-${desc.key}`}
              style={{
                color: 'var(--brand-text-primary)',
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: '-0.5px',
                marginBottom: 16,
                lineHeight: 1.2,
              }}
            >
              {desc.title}
            </h2>

            {desc.paragraphs.map((p, i) => (
              <p key={i} style={{
                color: 'var(--brand-text-primary)',
                fontSize: 15,
                lineHeight: 1.65,
                margin: '0 0 14px',
              }}>
                {p}
              </p>
            ))}

            {desc.bullets && desc.bullets.length > 0 && (
              <ul style={{
                margin: '4px 0 14px',
                paddingLeft: 22,
                color: 'var(--brand-text-primary)',
                fontSize: 14,
                lineHeight: 1.6,
              }}>
                {desc.bullets.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
              </ul>
            )}

            <style>{`
              @keyframes mitype-feature-info-fade {
                from { opacity: 0; }
                to   { opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}
