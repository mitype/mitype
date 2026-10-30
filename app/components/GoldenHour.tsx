'use client';
// Golden hour: a very light warm tint over the whole app that follows the
// member's local time. Strongest around sunrise and sunset, almost nothing
// at midday. It never blocks taps and never changes layout or colors in the
// code, it only lays a thin wash on top.

import { useEffect, useState } from 'react';

function warmth(d: Date): number {
  const h = d.getHours() + d.getMinutes() / 60;
  // Smooth bumps around 6:30 and 18:30, a faint glow at night, nearly none at noon.
  const bump = (center: number, width: number) => Math.exp(-Math.pow((h - center) / width, 2));
  const a = 0.075 * bump(6.5, 1.6) + 0.095 * bump(18.5, 1.9);
  const night = h < 5 || h > 21 ? 0.03 : 0;
  return Math.min(0.1, a + night + 0.008);
}

export function GoldenHour() {
  const [a, setA] = useState(0);
  useEffect(() => {
    const update = () => setA(warmth(new Date()));
    update();
    const id = window.setInterval(update, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2147483000,
        background: `rgba(255, 168, 92, ${a.toFixed(3)})`,
        transition: 'background 2s ease',
      }}
    />
  );
}
