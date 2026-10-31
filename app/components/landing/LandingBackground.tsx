'use client';
// Animated constellation behind the landing page: slow drifting points
// joined by faint copper lines that react to the cursor and drift with
// scroll. Pauses when the tab is hidden and stays still for members who
// ask their device to reduce motion.

import { useEffect, useRef } from 'react';

interface Pt { x: number; y: number; vx: number; vy: number; r: number; hot: boolean; ay: number }

export function LandingBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let pts: Pt[] = [];
    let mx = -1000;
    let my = -1000;
    let visible = true;
    let raf = 0;

    function size() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.max(28, Math.min(90, (w * h) / 11000)));
      pts = [];
      for (let i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: Math.random() * 1.4 + 0.5,
          hot: Math.random() < 0.08,
          ay: 0,
        });
      }
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      ctx!.clearRect(0, 0, w, h);
      const par = window.scrollY * 0.04;
      for (const a of pts) {
        if (!reduce) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < -10) a.x = w + 10;
          if (a.x > w + 10) a.x = -10;
          if (a.y < -10) a.y = h + 10;
          if (a.y > h + 10) a.y = -10;
          const dx = a.x - mx;
          const dy = a.y - my;
          const d = Math.hypot(dx, dy);
          if (d < 140 && d > 0) {
            a.x += (dx / d) * 0.35;
            a.y += (dy / d) * 0.35;
          }
        }
        a.ay = (((a.y - par * a.r) % h) + h) % h;
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const d2 = (a.x - b.x) * (a.x - b.x) + (a.ay - b.ay) * (a.ay - b.ay);
          if (d2 < 17000) {
            ctx!.strokeStyle = `rgba(200,149,108,${((1 - d2 / 17000) * 0.2).toFixed(3)})`;
            ctx!.lineWidth = 0.7;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.ay);
            ctx!.lineTo(b.x, b.ay);
            ctx!.stroke();
          }
        }
      }
      for (const a of pts) {
        ctx!.fillStyle = a.hot ? 'rgba(255,226,190,.9)' : 'rgba(220,170,130,.55)';
        ctx!.beginPath();
        ctx!.arc(a.x, a.ay, a.hot ? a.r + 1 : a.r, 0, Math.PI * 2);
        ctx!.fill();
        if (a.hot) {
          ctx!.fillStyle = 'rgba(242,207,168,.12)';
          ctx!.beginPath();
          ctx!.arc(a.x, a.ay, 9, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; };
    const onVis = () => { visible = !document.hidden; };
    size();
    window.addEventListener('resize', size);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className="lp-bg" aria-hidden="true" />;
}
