'use client';
// SignalGateIntro: the opener for The Wave and The Current.
//
// A deep ocean-blue veil drops over the page, a lattice of sea-blue light
// points ripples outward from the exact spot the member tapped (a white
// glowing shockwave ring leads it), then a circular iris of light opens
// from the same spot and reveals the page underneath.
//   * kind="wave":     the lattice moves in outward swells.
//   * kind="currents": the lattice swirls into a spiral.
// Drawn on one canvas (no video file). Honors reduced motion. Never blocks
// the page: it ignores touches and always closes itself.

import { useEffect, useRef, useState } from 'react';
import { GATE_ORIGIN_KEY } from './GateOriginTracker';

interface Props {
  kind: 'wave' | 'currents';
  onDone?: () => void;
  durationMs?: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut3 = (p: number) => 1 - Math.pow(1 - p, 3);
const easeOut4 = (p: number) => 1 - Math.pow(1 - p, 4);

export function SignalGateIntro({ kind, onDone, durationMs = 2200 }: Props) {
  const [shown, setShown] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(onDone);

  useEffect(() => { doneRef.current = onDone; });

  useEffect(() => {
    const finish = () => { setShown(false); doneRef.current?.(); };
    const reduced = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (reduced || !canvas || !ctx) { finish(); return; }

    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.scale(dpr, dpr);

    // Where the member tapped (fractions of the screen), if it was just now.
    let ox = W / 2;
    let oy = H * 0.62;
    try {
      const raw = sessionStorage.getItem(GATE_ORIGIN_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && Date.now() - o.at < 6000) { ox = o.x * W; oy = o.y * H; }
        sessionStorage.removeItem(GATE_ORIGIN_KEY);
      }
    } catch { /* use default */ }

    const maxR = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) * 1.05;
    const S = 20;
    const cols = Math.ceil(W / S) + 1;
    const rows = Math.ceil(H / S) + 1;

    // Soft water whoosh (best effort; browsers may block audio).
    let audioCtx: AudioContext | null = null;
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        audioCtx = new Ctor() as AudioContext;
        const ac = audioCtx;
        if (ac.state === 'suspended') ac.resume().catch(() => {});
        const sec = durationMs / 1000;
        const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * (sec + 0.1)), ac.sampleRate);
        const ch = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < ch.length; i++) {
          last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
          ch[i] = last * 3.2;
        }
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 2.5;
        bp.frequency.setValueAtTime(160, ac.currentTime);
        bp.frequency.exponentialRampToValueAtTime(1800, ac.currentTime + sec * 0.55);
        bp.frequency.exponentialRampToValueAtTime(300, ac.currentTime + sec);
        const g = ac.createGain();
        g.gain.setValueAtTime(0, ac.currentTime);
        g.gain.linearRampToValueAtTime(0.26, ac.currentTime + 0.25);
        g.gain.linearRampToValueAtTime(0.2, ac.currentTime + sec * 0.6);
        g.gain.linearRampToValueAtTime(0, ac.currentTime + sec);
        src.connect(bp); bp.connect(g); g.connect(ac.destination);
        src.start();
        src.stop(ac.currentTime + sec + 0.1);
      }
    } catch { /* silent */ }

    const t0 = performance.now();
    let raf = 0;
    let closed = false;

    function frame(now: number) {
      if (closed || !ctx) return;
      const t = now - t0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);

      // Veil
      ctx.fillStyle = `rgba(4,22,46,${clamp(t / 220)})`;
      ctx.fillRect(0, 0, W, H);

      // Lattice + shockwave
      const p = clamp((t - 120) / 1300);
      const e = easeOut3(p);
      const R = e * maxR;
      const fade = 1 - clamp((t - 1500) / 550);
      if (fade > 0) {
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const x0 = i * S + 4;
            const y0 = j * S + 4;
            const dx = x0 - ox;
            const dy = y0 - oy;
            const d = Math.hypot(dx, dy) || 0.01;
            const dl = d - R;
            const inf = Math.exp(-(dl * dl) / (2 * 36 * 36));
            const tr = d < R ? Math.exp(-(R - d) / 170) * 0.55 : 0;
            let x = x0;
            let y = y0;
            if (kind === 'wave') {
              const ds = inf * 13 * Math.sin(d * 0.09 - t * 0.012);
              x += (dx / d) * ds;
              y += (dy / d) * ds + tr * 4 * Math.sin(x0 * 0.05 + t * 0.006);
            } else {
              const ang = 2.4 * e * Math.exp(-d / 150);
              const c = Math.cos(ang);
              const s = Math.sin(ang);
              const k = 1 - 0.12 * inf;
              x = ox + (dx * c - dy * s) * k;
              y = oy + (dx * s + dy * c) * k;
            }
            const al = (0.14 + inf * 0.9 + tr * 0.6) * fade;
            if (al < 0.02) continue;
            ctx.fillStyle = `rgba(${Math.min(255, 70 + 185 * inf)},${Math.min(255, 170 + 85 * inf)},${Math.min(255, 225 + 30 * inf)},${Math.min(1, al)})`;
            ctx.beginPath();
            ctx.arc(x, y, 1 + inf * 2.3 + tr * 0.8, 0, 6.2832);
            ctx.fill();
          }
        }
        if (R < maxR) {
          ctx.lineWidth = 1.3;
          ctx.shadowColor = 'rgba(120,210,245,.9)';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = `rgba(225,247,255,${0.6 * fade})`;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(ox, oy, R, 0, 6.2832);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = `rgba(95,195,230,${0.32 * fade})`;
          ctx.setLineDash([2, 6]);
          ctx.beginPath();
          ctx.arc(ox, oy, R * 0.84, 0, 6.2832);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Iris: cut a growing hole in the veil to reveal the page, then ring it.
      const q = clamp((t - 950) / 1000);
      if (q > 0) {
        const r = easeOut4(q) * maxR * 1.12;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, 6.2832);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        if (q < 1) {
          ctx.lineWidth = 1.5;
          ctx.shadowColor = 'rgba(95,195,230,.8)';
          ctx.shadowBlur = 16;
          ctx.strokeStyle = `rgba(214,244,255,${(1 - q) * 0.9})`;
          ctx.beginPath();
          ctx.arc(ox, oy, r, 0, 6.2832);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      if (t < durationMs) {
        raf = requestAnimationFrame(frame);
      } else {
        closed = true;
        audioCtx?.close().catch(() => {});
        finish();
      }
    }
    raf = requestAnimationFrame(frame);

    // Safety net: always close even if the tab was throttled.
    const safety = window.setTimeout(() => {
      if (!closed) { closed = true; cancelAnimationFrame(raf); audioCtx?.close().catch(() => {}); finish(); }
    }, durationMs + 800);

    return () => {
      closed = true;
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      audioCtx?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, durationMs]);

  if (!shown) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100vw', height: '100dvh', display: 'block' }}
      />
    </div>
  );
}
