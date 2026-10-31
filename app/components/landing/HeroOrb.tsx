'use client';
// The hero's rotating network sphere with orbit rings and traveling
// signals, drawn in the same style as the Mitype logo. Only draws while
// on screen, and holds still for members who prefer reduced motion.

import { useEffect, useRef } from 'react';

interface Node3 { x: number; y: number; z: number; hot: boolean; ph: number }
interface Pulse { e: number; t: number; v: number }

export function HeroOrb() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let S = 0;
    let seen = true;
    let visible = true;
    let raf = 0;

    const N = 88;
    const nodes: Node3[] = [];
    const edges: Array<[number, number]> = [];
    const pulses: Pulse[] = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      nodes.push({ x: Math.cos(th) * rr, y, z: Math.sin(th) * rr, hot: i % 9 === 0, ph: Math.random() * 6.28 });
    }
    for (let i = 0; i < N; i++) {
      let c = 0;
      for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        if (dx * dx + dy * dy + dz * dz < 0.42 && c < 3) { edges.push([i, j]); c++; }
      }
    }
    for (let k = 0; k < 16; k++) {
      pulses.push({ e: Math.floor(Math.random() * edges.length), t: Math.random(), v: 0.004 + Math.random() * 0.006 });
    }
    const rings = [
      { a: 0.5, b: 1.5, s: 1.0, o: 0 },
      { a: -0.9, b: 0.2, s: 1.12, o: 2 },
      { a: 1.2, b: -0.6, s: 1.22, o: 4 },
    ];

    function size() {
      const r = wrap!.getBoundingClientRect();
      S = r.width;
      canvas!.width = S * dpr;
      canvas!.height = S * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function proj(x: number, y: number, z: number, ry: number, tx: number, R: number) {
      const c = Math.cos(ry), s = Math.sin(ry);
      const x1 = x * c - z * s, z1 = x * s + z * c;
      const ct = Math.cos(tx), st = Math.sin(tx);
      const y1 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      const k = 1 / (1 - z2 * 0.22);
      return { x: S / 2 + x1 * R * k, y: S / 2 + y1 * R * k, z: z2, k };
    }

    function glow(x: number, y: number, r: number, a: number) {
      const g = ctx!.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,236,208,${a})`);
      g.addColorStop(0.4, `rgba(242,190,140,${a * 0.5})`);
      g.addColorStop(1, 'rgba(242,190,140,0)');
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, Math.PI * 2);
      ctx!.fill();
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, S, S);
      const R = S * 0.34;
      const ry = reduce ? 0.6 : t * 0.00016 + window.scrollY * 0.0006;
      const tx = -0.38;
      glow(S / 2, S / 2, S * 0.5, 0.1);
      const pr = nodes.map((n) => proj(n.x, n.y, n.z, ry, tx, R));
      for (const [ia, ib] of edges) {
        const a = pr[ia], b = pr[ib];
        const al = 0.05 + 0.26 * ((a.z + b.z) / 2 + 1) / 2;
        ctx!.strokeStyle = `rgba(214,160,116,${al.toFixed(3)})`;
        ctx!.lineWidth = 0.8;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }
      for (const rg of rings) {
        ctx!.beginPath();
        for (let i = 0; i <= 96; i++) {
          const th = (i / 96) * Math.PI * 2;
          const x = Math.cos(th) * rg.s, z = Math.sin(th) * rg.s;
          const cx = Math.cos(rg.a), sx = Math.sin(rg.a);
          const y1 = -z * sx, z1 = z * cx;
          const cz = Math.cos(rg.b), sz = Math.sin(rg.b);
          const x2 = x * cz - y1 * sz, y2 = x * sz + y1 * cz;
          const q = proj(x2, y2, z1, ry * 0.6, tx, R);
          if (i === 0) ctx!.moveTo(q.x, q.y); else ctx!.lineTo(q.x, q.y);
        }
        ctx!.strokeStyle = 'rgba(232,184,140,.34)';
        ctx!.lineWidth = 1;
        ctx!.stroke();
        const th2 = (reduce ? 1 : t * 0.00055) + rg.o;
        const x = Math.cos(th2) * rg.s, z = Math.sin(th2) * rg.s;
        const cx = Math.cos(rg.a), sx = Math.sin(rg.a);
        const y1 = -z * sx, z1 = z * cx;
        const cz = Math.cos(rg.b), sz = Math.sin(rg.b);
        const x2 = x * cz - y1 * sz, y2 = x * sz + y1 * cz;
        const q = proj(x2, y2, z1, ry * 0.6, tx, R);
        glow(q.x, q.y, 16, 0.9);
        ctx!.fillStyle = '#fff3e0';
        ctx!.beginPath();
        ctx!.arc(q.x, q.y, 3.2, 0, Math.PI * 2);
        ctx!.fill();
      }
      for (let i = 0; i < N; i++) {
        const q = pr[i], n = nodes[i];
        const dep = (q.z + 1) / 2;
        const r = (n.hot ? 2.8 : 1.5) * q.k * (0.6 + dep * 0.7);
        if (n.hot) glow(q.x, q.y, r * 5 + Math.sin(t * 0.003 + n.ph) * 2, 0.5 * (0.4 + dep));
        ctx!.fillStyle = n.hot ? `rgba(255,238,214,${0.5 + dep * 0.5})` : `rgba(226,176,132,${0.25 + dep * 0.6})`;
        ctx!.beginPath();
        ctx!.arc(q.x, q.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }
      for (const p of pulses) {
        if (!reduce) p.t += p.v;
        if (p.t > 1) { p.t = 0; p.e = Math.floor(Math.random() * edges.length); }
        const a = pr[edges[p.e][0]], b = pr[edges[p.e][1]];
        const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        glow(x, y, 10, 0.85);
        ctx!.fillStyle = '#fff';
        ctx!.beginPath();
        ctx!.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function loop(t: number) {
      raf = requestAnimationFrame(loop);
      if (visible && seen) draw(t);
    }

    const io = new IntersectionObserver((e) => { seen = e[0].isIntersecting; });
    io.observe(wrap);
    const onVis = () => { visible = !document.hidden; };
    size();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', size);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div ref={wrapRef} className="lp-orbwrap lp-rv" style={{ ['--i' as string]: 2 }}>
      <canvas ref={canvasRef} className="lp-orb" aria-hidden="true" />
      <span className="lp-chip lp-c1">Discover</span>
      <span className="lp-chip lp-c2">Wave</span>
      <span className="lp-chip lp-c3">Moments</span>
      <span className="lp-chip lp-c4">Messages</span>
    </div>
  );
}
