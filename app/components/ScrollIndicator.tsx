'use client';
// A subtle "scroll" hint that lives at the bottom of the hero section.
// Bounces gently to draw the eye, fades out the moment the visitor
// starts scrolling. Click/tap acts as a shortcut — it scrolls one
// viewport down so people can use it like a button if they want.

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
        bottom: 'max(24px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 0.35s ease',
        pointerEvents: hidden ? 'none' : 'auto',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 14px',
        fontFamily: 'inherit',
        zIndex: 50,
      }}
    >
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          animation: 'mitype-scroll-bounce 2.2s ease-in-out infinite',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#c8956c',
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          Scroll
        </span>
        <svg
          width="22"
          height="14"
          viewBox="0 0 22 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 2 L11 11 L20 2"
            stroke="#c8956c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <style>{`
        @keyframes mitype-scroll-bounce {
          0%, 100% { transform: translateY(0); }
          50%     { transform: translateY(8px); }
        }
      `}</style>
    </button>
  );
}
