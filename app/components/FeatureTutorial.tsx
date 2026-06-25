'use client';
// Generic multi-slide tutorial modal.
//
// Drop one into any page to introduce new features. The modal only
// shows once per device (tracked in localStorage by the `storageKey`
// prop). When the user finishes the last slide OR taps "Skip" we
// mark it seen — the next visit gets nothing.
//
// To re-announce a feature after a meaningful change, bump the version
// suffix in the storageKey (`xyz-v2` etc).

import { useEffect, useState } from 'react';

export interface TutorialSlide {
  title: string;
  body: string;
  icon: string;
}

interface Props {
  storageKey: string;
  slides: TutorialSlide[];
  /** Optional eyebrow / category title shown at the top of every
   *  slide — e.g. "New in The Wave Feed". */
  eyebrow?: string;
}

export function FeatureTutorial({ storageKey, slides, eyebrow }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (window.localStorage.getItem(storageKey) === '1') return;
      // Slight delay so the host page can settle (skeletons, async loads)
      // before the overlay drops in.
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    } catch {
      // localStorage unavailable (private browsing, etc.) — show anyway.
      setOpen(true);
    }
  }, [storageKey]);

  if (!mounted || !open || slides.length === 0) return null;

  function markSeen() {
    try { window.localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
  }
  async function done() {
    setClosing(true);
    markSeen();
    setTimeout(() => setOpen(false), 280);
  }

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={eyebrow ?? 'New feature tutorial'}
      data-no-swipe-back="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,18,8,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        opacity: closing ? 0 : 1,
        transition: 'opacity 0.28s ease',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, var(--brand-personal-bg-peach-warm) 0%, var(--brand-personal-bg-peach) 100%)',
          borderRadius: 28,
          maxWidth: 440,
          width: '100%',
          padding: '40px 32px 28px',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        {eyebrow && (
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--brand-personal)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: 12,
          }}>
            {eyebrow}
          </div>
        )}

        <div style={{ fontSize: 64, marginBottom: 16 }}>{slide.icon}</div>
        <h2
          style={{
            color: 'var(--brand-text-primary)',
            fontSize: 24,
            fontWeight: 800,
            margin: '0 0 14px',
            letterSpacing: '-0.5px',
          }}
        >
          {slide.title}
        </h2>
        <p
          style={{
            color: 'var(--brand-personal-text-head)',
            fontSize: 16,
            lineHeight: 1.55,
            margin: '0 0 28px',
          }}
        >
          {slide.body}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          {slides.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === index ? 28 : 8,
                height: 8,
                borderRadius: 100,
                background: i === index ? 'var(--brand-personal)' : 'rgba(200,149,108,0.35)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              style={{
                flex: 1,
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(200,149,108,0.4)',
                borderRadius: 100,
                color: 'var(--brand-personal-text-mid)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? done : () => setIndex(index + 1)}
            style={{
              flex: 1,
              padding: '14px',
              background: 'var(--brand-personal)',
              border: 'none',
              borderRadius: 100,
              color: 'white',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 8px 22px rgba(200,149,108,0.32)',
            }}
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>

        {!isLast && (
          <button
            type="button"
            onClick={done}
            style={{
              marginTop: 14,
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-personal-text-light)',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}
