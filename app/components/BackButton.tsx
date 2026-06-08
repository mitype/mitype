'use client';
// Universal back arrow button. Drop into any page header.
//
// Behavior:
//   - If the browser has history, pop back one step (router.back()).
//   - If the user landed directly on this page (no history), navigate
//     to the supplied fallbackHref or /dashboard.
//
// Style is light by default (works on cream backgrounds); pass
// `variant="dark"` for use on dark surfaces like /wave.

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Props {
  fallbackHref?: string;
  variant?: 'light' | 'dark';
  ariaLabel?: string;
}

export function BackButton({
  fallbackHref = '/dashboard',
  variant = 'light',
  ariaLabel = 'Back',
}: Props) {
  const router = useRouter();
  // Only show after mount so SSR markup doesn't render arrow + history
  // logic gets a chance to read window.history.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function onClick() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  const colors =
    variant === 'dark'
      ? { color: 'white', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)' }
      : { color: '#8a7560', background: 'transparent', border: 'none' };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: 100,
        cursor: 'pointer',
        fontSize: 22,
        fontWeight: 700,
        padding: 0,
        fontFamily: 'inherit',
        opacity: mounted ? 1 : 0.6,
        ...colors,
      }}
    >
      ←
    </button>
  );
}
