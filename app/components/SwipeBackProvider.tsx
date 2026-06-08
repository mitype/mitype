'use client';
// Universal swipe-left-to-go-back gesture for the whole app.
//
// Listens for touchstart/touchend on the document. A brisk right-to-left
// swipe with low vertical drift calls router.back() — same gesture the
// Wave feed has had, now applied to every page so users can navigate
// the entire app by feel.
//
// Opt-out: any subtree that wants to suppress the gesture (for example,
// a fullscreen view with its own swipe handling, or a horizontal
// carousel) can render a wrapper with `data-no-swipe-back="true"`.
// The handler walks the touch's target chain and ignores the swipe if
// it started inside an opt-out element.

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Thresholds tuned to feel native without hijacking vertical scroll.
const MIN_HORIZONTAL_PX = 90;
const MAX_VERTICAL_DRIFT_PX = 60;
const MAX_DURATION_MS = 600;
// Don't fire on the home page — there's nothing to go back to.
const NEVER_BACK_FROM = new Set<string>(['/', '/dashboard', '/login']);

interface TouchPoint {
  x: number;
  y: number;
  t: number;
}

function startedInsideOptOut(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null;
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.noSwipeBack === 'true') return true;
    el = el.parentElement;
  }
  return false;
}

export function SwipeBackProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Disable on routes where back navigation isn't useful.
    if (pathname && NEVER_BACK_FROM.has(pathname)) return;

    let start: TouchPoint | null = null;
    let optedOut = false;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      optedOut = startedInsideOptOut(e.target);
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    }

    function onEnd(e: TouchEvent) {
      const s = start;
      start = null;
      if (!s || optedOut) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const dt = Date.now() - s.t;
      if (
        dx < -MIN_HORIZONTAL_PX &&
        Math.abs(dy) < MAX_VERTICAL_DRIFT_PX &&
        dt < MAX_DURATION_MS
      ) {
        // history.length > 1 means we have a page to go back to; on a
        // fresh tab open, fall back to /dashboard so the user isn't
        // stuck staring at the same page.
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        } else {
          router.push('/dashboard');
        }
      }
    }

    // Passive listeners — we never preventDefault, we just observe.
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [pathname, router]);

  return <>{children}</>;
}
