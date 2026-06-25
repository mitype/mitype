'use client';
// OceanBackground — the signature visual under The Current feed.
//
// As the user scrolls down, the page background lerps from a deep
// slate-blue (the "surface") toward true abyss-black, and a sparse field
// of bubble particles drifts gently upward. The further you scroll, the
// darker it gets and the fewer bubbles appear — you're descending into
// the abyss.
//
// Implementation notes:
//   - Background gradient is computed off scrollY via requestAnimationFrame
//     so it stays smooth on phones.
//   - Bubbles are absolutely-positioned divs animated via CSS keyframes;
//     count is reduced as scroll depth grows.
//   - Honors prefers-reduced-motion (fewer bubbles, no shimmer).
//   - Renders as a fixed full-viewport layer behind the feed content.

import { useEffect, useRef, useState } from 'react';

const SURFACE_RGB = [10, 37, 64] as const;   // #0a2540
const ABYSS_RGB   = [0, 8, 20] as const;     // #000814

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function mixColor(t: number): string {
  const c = SURFACE_RGB.map((s, i) => Math.round(lerp(s, ABYSS_RGB[i], t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

interface Bubble {
  id: number;
  left: number;     // 0–100 (vw)
  size: number;     // px
  delay: number;    // s
  duration: number; // s
  opacity: number;
}

const REDUCED_MOTION =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export function OceanBackground() {
  const [depth, setDepth] = useState(0); // 0 at top, 1 deep
  const rafRef = useRef<number | null>(null);
  const lastYRef = useRef(0);

  // Spawn a sparse field of bubbles once on mount. Fewer if reduced motion.
  const [bubbles] = useState<Bubble[]>(() => {
    const count = REDUCED_MOTION ? 6 : 22;
    const out: Bubble[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        id: i,
        left: Math.random() * 100,
        size: 4 + Math.random() * 12,
        delay: Math.random() * 12,
        duration: 10 + Math.random() * 14,
        opacity: 0.12 + Math.random() * 0.18,
      });
    }
    return out;
  });

  useEffect(() => {
    function tick() {
      const y = window.scrollY;
      lastYRef.current = y;
      // Reach max darkness at ~1.5x viewport-height of scrolling.
      const max = Math.max(window.innerHeight * 1.5, 1);
      const t = Math.min(1, y / max);
      setDepth(t);
      rafRef.current = null;
    }
    function onScroll() {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(tick);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    tick();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Bubble field fades out as we go deep — the abyss is quiet.
  const bubbleOpacity = Math.max(0, 1 - depth * 1.4);

  return (
    <>
      {/* Solid background color tinted by depth. Sits behind everything
          else, fixed to viewport so it doesn't scroll. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: `linear-gradient(180deg, ${mixColor(depth)} 0%, ${mixColor(Math.min(depth + 0.4, 1))} 100%)`,
          zIndex: -2,
          pointerEvents: 'none',
          transition: 'background 0.18s linear',
        }}
      />
      {/* Bubble field. Pure CSS animation; reduced motion shows them
          static at a slight opacity. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          opacity: bubbleOpacity,
          transition: 'opacity 0.4s linear',
        }}
      >
        {bubbles.map((b) => (
          <span
            key={b.id}
            style={{
              position: 'absolute',
              bottom: -40,
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,${b.opacity + 0.15}) 0%, rgba(255,255,255,${b.opacity}) 50%, rgba(255,255,255,0) 75%)`,
              border: '1px solid rgba(255,255,255,0.15)',
              animation: REDUCED_MOTION
                ? undefined
                : `mitype-bubble-rise ${b.duration}s linear ${b.delay}s infinite`,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes mitype-bubble-rise {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          12% {
            opacity: 0.9;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-110vh) translateX(20px);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
