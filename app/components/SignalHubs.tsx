'use client';
// Dashboard menu for the Signal design: three hubs, each with a small
// rotating signal globe and slim futuristic link tiles joined to it by
// drawn connector lines. Globes alternate sides. Only visible globes animate.

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export interface HubItem {
  label: string;
  short: string;
  href: string;
  color: string;
  pulse?: boolean;
  badge?: number;
}
export interface Hub { title: string; items: HubItem[] }
interface Props { hubs: Hub[]; account: Array<{ label: string; href: string }> }

// Shared scroll "boost" so globes spin faster while the page scrolls.
let boost = 0;
let lastY = 0;
let listening = false;
function ensureScrollListener() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const d = Math.abs(window.scrollY - lastY);
    lastY = window.scrollY;
    boost = Math.min(2.2, boost + d * 0.02);
  }, { passive: true });
}

function makePoints(seed: number) {
  const pts: Array<[number, number, number]> = [];
  const n = 50;
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.399963 + seed;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
}

function Globe({ seed }: { seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const pts = makePoints(seed);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let rot = seed * 1.7;
    let visible = false;
    let raf = 0;
    let last = performance.now();
    const W = cv.width, R = W * 0.44, c = W / 2;
    const tilt = 0.35, ct = Math.cos(tilt), st = Math.sin(tilt);

    function draw(dt: number) {
      if (!ctx) return;
      rot += dt * (0.25 + boost);
      ctx.clearRect(0, 0, W, W);
      const gr = ctx.createRadialGradient(c, c, R * 0.2, c, c, R * 1.1);
      gr.addColorStop(0, 'rgba(90,64,44,0.6)');
      gr.addColorStop(1, 'rgba(15,13,11,0.95)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(c, c, R * 1.04, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(242,207,168,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c, c, R * 1.04, 0, 7); ctx.stroke();
      const s = Math.sin(rot), co = Math.cos(rot);
      const p = pts.map((q) => {
        const x = q[0] * co + q[2] * s;
        let z = -q[0] * s + q[2] * co;
        const y = q[1] * ct - z * st;
        z = q[1] * st + z * ct;
        return [c + x * R, c + y * R, z];
      });
      for (let i = 0; i < p.length; i++) {
        for (let j = i + 1; j < p.length; j++) {
          const d = Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]);
          if (d < R * 0.5) {
            const a = (1 - d / (R * 0.5)) * 0.55 * ((p[i][2] + p[j][2] + 2) / 4 + 0.2);
            ctx.strokeStyle = `rgba(210,160,120,${a})`;
            ctx.beginPath(); ctx.moveTo(p[i][0], p[i][1]); ctx.lineTo(p[j][0], p[j][1]); ctx.stroke();
          }
        }
      }
      p.forEach((q, i) => {
        const f = (q[2] + 1) / 2;
        const r = (i % 7 === 0 ? 3.4 : 1.9) * (0.6 + f * 0.7);
        const gl = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r * 3.4);
        gl.addColorStop(0, `rgba(255,240,220,${0.4 + f * 0.6})`);
        gl.addColorStop(1, 'rgba(200,149,108,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(q[0], q[1], r * 3.4, 0, 7); ctx.fill();
      });
    }

    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      boost *= 0.94;
      if (visible) draw(dt);
      raf = requestAnimationFrame(loop);
    }
    ensureScrollListener();
    draw(0);
    const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? false; });
    io.observe(cv);
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [seed]);
  return <canvas ref={ref} width={192} height={192} className="sh-globe" aria-hidden="true" />;
}

function HubBlock({ hub, index }: { hub: Hub; index: number }) {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const right = index % 2 === 1;

  useEffect(() => {
    const el = root.current, sv = svg.current;
    if (!el || !sv) return;
    const NS = 'http://www.w3.org/2000/svg';
    function layout() {
      if (!el || !sv) return;
      const hr = el.getBoundingClientRect();
      const g = el.querySelector('canvas');
      if (!g) return;
      const gc = g.getBoundingClientRect();
      const gx = right ? gc.left - hr.left + 4 : gc.right - hr.left - 4;
      const gy = gc.top + gc.height / 2 - hr.top;
      sv.innerHTML = '';
      el.querySelectorAll('.sh-tile').forEach((t) => {
        // offset* ignores the slide-in transform, so lines land on the tile's
        // resting edge. End 5px inside the edge: on the card, but in front of the number.
        const tile = t as HTMLElement;
        const x = right ? tile.offsetLeft + tile.offsetWidth - 5 : tile.offsetLeft + 5;
        const y = tile.offsetTop + tile.offsetHeight / 2;
        const mx = (gx + x) / 2;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', `M${gx} ${gy} C${mx} ${gy} ${mx} ${y} ${x} ${y}`);
        path.style.setProperty('--l', String(Math.round(Math.hypot(x - gx, y - gy) * 1.3)));
        sv.appendChild(path);
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', String(x)); dot.setAttribute('cy', String(y)); dot.setAttribute('r', '2.5');
        sv.appendChild(dot);
      });
    }
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(el);
    const io = new IntersectionObserver((es) => {
      if (es[0]?.isIntersecting) { el.classList.add('sh-in'); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, [right, hub.items.length]);

  return (
    <section ref={root} className={`sh-hub${right ? ' sh-r' : ''}`}>
      <div className="sh-gcol">
        <div className="sh-gstick">
          <Globe seed={index} />
          <div className="sh-glab">{hub.title}</div>
        </div>
      </div>
      <div className="sh-cards">
        {hub.items.map((it, i) => (
          <Link
            key={it.href}
            href={it.href}
            className={`sh-tile${it.pulse ? ' sh-new' : ''}`}
            style={{ ['--c' as string]: it.color, ['--d' as string]: `${i * 90}ms` }}
          >
            <span className="sh-ix">{String(i + 1 + index * 4).padStart(2, '0')}</span>
            <span className="sh-tx">
              <b>
                {it.label}
                {it.pulse && <em className="sh-tag">New</em>}
                {!!it.badge && <em className="sh-badge">{it.badge > 99 ? '99+' : it.badge}</em>}
              </b>
              <span>{it.short}</span>
            </span>
            <i className="sh-dt" />
          </Link>
        ))}
      </div>
      <svg ref={svg} className="sh-ln" aria-hidden="true" />
    </section>
  );
}

export function SignalHubs({ hubs, account }: Props) {
  return (
    <div className="sh-wrap">
      <p className="sh-hd">{'// Your signal hubs'}</p>
      {hubs.map((h, i) => <HubBlock key={h.title} hub={h} index={i} />)}
      <p className="sh-hd">{'// Account'}</p>
      <div className="sh-acct">
        {account.map((a) => <Link key={a.href} href={a.href}>{a.label}</Link>)}
      </div>
    </div>
  );
}
