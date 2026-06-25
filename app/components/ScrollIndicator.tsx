'use client';
// A "scroll" hint that lives near the bottom of the hero section.
//
// Why it's a contained bronze pill (was previously bare text):
//   On phones the bare text was getting clipped by the iPhone home
//   indicator and lost against the cream background — testers
//   reported "is there more below the fold?" because they couldn't
//   see the hint. The pill gives it a clear container with shadow so
//   it pops on any background, and we lift it higher above the safe
//   area so it never lands under the home-indicator bar.

import { useEffect, useState } from 'react';

export function ScrollIndicator() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function onScroll() {
      // Hide once they've scrolled even slightly — they got the hint.
      setHidden(window.scrollY > 80);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleClick() {
    // Tap-to-scroll fallback — scrolls just under one viewport so the
    // top of the next section lands cleanly without jumping past it.
    window.scrollBy({
      top: window.innerHeight - 100,
      behavior: 'smooth',
    });
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Scroll down to see more"
      style={{
        position: 'absolute',
        // Lifted further from the safe area so the iPhone home
        // indicator never overlaps the pill.
        bottom: 'calc(max(40px, env(safe-area-inset-bottom)) + 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 0.35s ease',
        pointerEvents: hidden ? 'none' : 'auto',
        background: 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        padding: '10px 22px 10px 22px',
        fontFamily: 'inherit',
        borderRadius: 100,
        boxShadow: '0 12px 28px rgba(200,149,108,0.45)',
        zIndex: 50,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        // Gentle pulse to draw attention without being annoying.
        animation: 'mitype-scroll-bounce 2.2s ease-in-out infinite',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 2.5,
          textTransform: 'uppercase',
        }}
      >
        Scroll
      </span>
      <svg
        width="18"
        height="12"
        viewBox="0 0 22 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 2 L11 11 L20 2"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <style>{`
        @keyframes mitype-scroll-bounce {
          0%, 100% { transform: translate(-50%, 0); }
          50%     { transform: translate(-50%, 6px); }
        }
      `}</style>
    </button>
  );
}
