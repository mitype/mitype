'use client';
// Animated constellation behind the app pages while the new "Signal" theme
// is on. Renders nothing at all in the normal theme. Skipped on screens that
// are full of video, photos or live chat so they stay light and smooth.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LandingBackground } from './landing/LandingBackground';
import { getTheme, THEME_EVENT, type Theme } from '../lib/theme';

const SKIP = ['/', '/wave', '/moments', '/messages'];

export function SignalBackdrop() {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>('default');

  useEffect(() => {
    const sync = () => setThemeState(getTheme());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (theme !== 'signal') return null;
  if (SKIP.some((p) => pathname === p || (p !== '/' && pathname?.startsWith(p + '/')))) return null;

  return (
    <LandingBackground
      appStyle={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}
    />
  );
}
