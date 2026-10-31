'use client';
// Small behaviors for the landing page: reveal-on-scroll, the sticky nav
// shadow, the "signal path" that draws itself as you scroll, the glow that
// follows the cursor on feature cards, and the hero scroll hint. Content is
// fully visible without JavaScript; the hidden start state is only applied
// once this runs.

import { useEffect, useLayoutEffect } from 'react';

export function LandingEffects() {
  useLayoutEffect(() => {
    document.querySelector('.lp-root')?.classList.add('lp-js');
  }, []);

  useEffect(() => {
    const root = document.querySelector('.lp-root');
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('lp-in');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12 });
    root.querySelectorAll('.lp-rv').forEach((el) => io.observe(el));

    const nav = root.querySelector('.lp-nav');
    const path = root.querySelector<HTMLElement>('.lp-path');
    const steps = Array.from(root.querySelectorAll('.lp-step'));
    const hint = root.querySelector<HTMLElement>('.lp-hint');
    function onScroll() {
      nav?.classList.toggle('lp-s', window.scrollY > 24);
      if (hint) {
        const gone = window.scrollY > 80;
        hint.style.opacity = gone ? '0' : '1';
        hint.style.pointerEvents = gone ? 'none' : 'auto';
      }
      if (path) {
        const r = path.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.max(0, Math.min(1, (vh * 0.78 - r.top) / (r.height + vh * 0.2)));
        path.style.setProperty('--p', p.toFixed(3));
        steps.forEach((s, i) => s.classList.toggle('lp-on', p > i / 3 + 0.05));
      }
    }
    function onMove(e: PointerEvent) {
      const t = (e.target as Element | null)?.closest<HTMLElement>('.lp-tile');
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`);
      t.style.setProperty('--my', `${e.clientY - r.top}px`);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    document.addEventListener('pointermove', onMove, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('pointermove', onMove);
    };
  }, []);

  return null;
}

export function ScrollHint() {
  return (
    <button
      type="button"
      className="lp-hint"
      aria-label="Scroll down to see more"
      onClick={() => window.scrollBy({ top: window.innerHeight - 100, behavior: 'smooth' })}
    >
      Scroll<i />
    </button>
  );
}
