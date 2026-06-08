'use client';
// Tiny page-transition wrapper. Listens for pathname changes and runs a
// brief opacity fade so navigating between routes feels intentional and
// smooth instead of snapping. ~150ms — short enough to feel instant.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const FADE_DURATION_MS = 150;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // On every route change: dip to 0 then back to 1.
    setOpacity(0);
    const t = setTimeout(() => setOpacity(1), 10);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      style={{
        opacity,
        transition: `opacity ${FADE_DURATION_MS}ms ease-out`,
        // Keep the page laid out so the fade doesn't cause height
        // collapse — important when next route is shorter than prev.
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
