'use client';
// Onboarding coachmark — a small floating tip card that fades in below the
// nav, sits there for a few seconds while the user reads it, then fades
// back out. Each unique `storageKey` only ever shows once per browser so
// returning users aren't pestered.
//
// Usage:
//   <Coachmark storageKey="coachmark-discover-v1" title="Tip">
//     Tap the heart to send a message — they'll see it in your Messages.
//   </Coachmark>
//
// Bumping the version suffix in the storage key forces it to show again
// for everyone (useful if the message changes meaningfully).

import { useEffect, useState } from 'react';

interface CoachmarkProps {
  storageKey: string;
  title?: string;
  children: React.ReactNode;
  // How long to wait after mount before fading in (ms). Lets the page
  // settle so the coachmark doesn't fight with a loading skeleton.
  delay?: number;
  // How long to stay fully visible before auto-dismissing (ms).
  duration?: number;
  // Where it floats. Defaults to top-center under the nav.
  placement?: 'top' | 'bottom-right';
}

type Phase = 'pending' | 'entering' | 'visible' | 'leaving' | 'gone';

export function Coachmark({
  storageKey,
  title,
  children,
  delay = 700,
  duration = 9000,
  placement = 'top',
}: CoachmarkProps) {
  const [phase, setPhase] = useState<Phase>('pending');
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);

  // Read localStorage on mount. Until we know, render nothing — this also
  // avoids any SSR/CSR hydration mismatch since localStorage isn't on the
  // server.
  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(storageKey);
      setHasSeen(seen === '1');
    } catch {
      // Some browsers (private mode, locked-down enterprise installs)
      // throw on localStorage. In that case just show the coachmark —
      // it's better than crashing.
      setHasSeen(false);
    }
  }, [storageKey]);

  // Drive the phase machine: pending → entering → visible → leaving → gone.
  useEffect(() => {
    if (hasSeen !== false) return;

    const enterTimer = setTimeout(() => {
      setPhase('entering');
      // Next frame, flip to visible so the CSS transition runs.
      requestAnimationFrame(() => setPhase('visible'));
    }, delay);

    const leaveTimer = setTimeout(() => {
      setPhase('leaving');
    }, delay + duration);

    const goneTimer = setTimeout(() => {
      setPhase('gone');
      markSeen();
    }, delay + duration + 300);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(leaveTimer);
      clearTimeout(goneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSeen, delay, duration]);

  function markSeen() {
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }
  }

  function handleDismiss() {
    setPhase('leaving');
    setTimeout(() => {
      setPhase('gone');
      markSeen();
    }, 250);
  }

  if (hasSeen !== false) return null;
  if (phase === 'gone' || phase === 'pending') {
    // Render an invisible placeholder during 'pending' so the timer setup
    // gets a chance to run. (We return null here only after gone.)
    if (phase === 'gone') return null;
  }

  const isVisible = phase === 'visible';

  const placementStyles: React.CSSProperties =
    placement === 'bottom-right'
      ? {
          position: 'fixed',
          bottom: 24,
          right: 24,
          left: 'auto',
          maxWidth: 360,
        }
      : {
          position: 'fixed',
          top: 88,
          left: '50%',
          transform: `translateX(-50%) translateY(${isVisible ? 0 : -8}px)`,
          maxWidth: 420,
          width: 'calc(100% - 32px)',
        };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        ...placementStyles,
        zIndex: 900,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.28s ease, transform 0.28s ease',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #fff8ec 0%, #fff3ec 100%)',
          border: '1px solid rgba(200,149,108,0.35)',
          borderRadius: 18,
          padding: '14px 44px 14px 18px',
          boxShadow: '0 12px 32px rgba(26,18,8,0.18)',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          position: 'relative',
        }}
      >
        {title && (
          <p
            style={{
              color: '#c8956c',
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '0 0 4px',
            }}
          >
            {title}
          </p>
        )}
        <p
          style={{
            color: '#1a1208',
            fontSize: 14,
            lineHeight: 1.5,
            margin: 0,
            fontWeight: 500,
          }}
        >
          {children}
        </p>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss tip"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            color: '#a89278',
            fontSize: 16,
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
      </div>
    </div>
  );
}
