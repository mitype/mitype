'use client';
// Remembers where the member tapped when they open The Wave or The
// Current, so the Signal Gate transition can ripple out from that exact
// spot. Stores the tap as fractions of the screen in sessionStorage for
// a few seconds. Renders nothing.

import { useEffect } from 'react';

export const GATE_ORIGIN_KEY = 'mitype-gate-origin';

export function GateOriginTracker() {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      try {
        const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (!a) return;
        const path = new URL(a.href, window.location.href).pathname;
        if (path !== '/wave' && path !== '/currents') return;
        sessionStorage.setItem(
          GATE_ORIGIN_KEY,
          JSON.stringify({
            x: e.clientX / window.innerWidth,
            y: e.clientY / window.innerHeight,
            at: Date.now(),
          }),
        );
      } catch { /* never block navigation */ }
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);
  return null;
}
