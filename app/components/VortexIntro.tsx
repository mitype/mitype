'use client';
// VortexIntro — full-screen swirling-water vortex that plays every time
// a user opens The Current. Renders as a Canvas2D spiral animation with
// a synchronized Web Audio whoosh.
//
// Behavior:
//   - Plays on EVERY mount (no sessionStorage gate) per product spec.
//   - Sound triggered as a direct consequence of the user navigating
//     here from "The Current" entry, so browser autoplay rules permit it.
//   - prefers-reduced-motion: skips animation entirely and lands in
//     the feed immediately (also skips audio).

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Total duration of the animation in ms. */
  durationMs?: number;
  /** Called once the vortex finishes or is skipped. */
  onDone?: () => void;
}

const DEFAULT_DURATION = 1800;

export function VortexIntro({ durationMs = DEFAULT_DURATION, onDone }: Props) {
  const [active, setActive] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // prefers-reduced-motion: skip the whole effect.
    const reduced = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    if (reduced) {
      setActive(false);
      onDone?.();
      return;
    }
    setActive(true);

    // ---------- audio ----------
    // Synthesize the vortex whoosh: bandpass-filtered pink noise with a
    // sweeping center frequency. Mirrors the animation length.
    let audioCtx: AudioContext | null = null;
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        audioCtx = new Ctor();
        const ctx = audioCtx!;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const sec = durationMs / 1000;
        const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * (sec + 0.1)), ctx.sampleRate);
        const ch = noiseBuf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < ch.length; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.04 * w) / 1.04;
          ch[i] = last * 3.2;
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 5;
        bp.frequency.setValueAtTime(160, ctx.currentTime);
        bp.frequency.exponentialRampToValueAtTime(1900, ctx.currentTime + sec * 0.65);
        bp.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + sec);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.34, ctx.currentTime + 0.18);
        gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + sec * 0.7);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + sec + 0.05);
        src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
        src.start();
        src.stop(ctx.currentTime + sec + 0.1);
      }
    } catch { /* silent */ }

    // ---------- canvas animation ----------
    const canvas = canvasRef.current;
    if (!canvas) {
      const t = setTimeout(() => {
        setActive(false);
        onDone?.();
      }, durationMs);
      return () => clearTimeout(t);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      if (!canvas) return;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    }
    resize();
    window.addEventListener('resize', resize);
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) {
      const t = setTimeout(() => {
        setActive(false);
        onDone?.();
      }, durationMs);
      return () => clearTimeout(t);
    }

    // Pre-generate spiral arm offsets + foam-bead positions. Doing this
    // once (instead of per-frame) is a meaningful perf win on phones.
    const ARMS = 26;
    const arms = Array.from({ length: ARMS }, (_, i) => ({
      phase: (i / ARMS) * Math.PI * 2,
      width: 0.6 + (i % 3) * 0.4 + Math.random() * 0.6,
      bright: 0.18 + Math.random() * 0.5,
    }));
    const FOAM = 80;
    const foam = Array.from({ length: FOAM }, () => ({
      armOffset: Math.random(),       // 0–1 along an arm
      angleJitter: (Math.random() - 0.5) * 0.3,
      size: 0.6 + Math.random() * 2.4,
      sparkle: Math.random(),
    }));

    const start = performance.now();
    let raf = 0;

    function frame(now: number) {
      if (!ctx2d || !canvas) return;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      // Camera zoom: the whole thing scales up over time as if you're
      // falling into the void. Easing makes the rate accelerate.
      const zoomEase = t * t * (3 - 2 * t);
      const zoom = 1 + zoomEase * 4.5;
      const baseRadius = Math.min(w, h) * 0.6 * zoom;
      // The rotation speeds up as we go inward (and as time progresses)
      // for that "spiral suction" feel.
      const rotation = Math.pow(elapsed / 1000, 1.3) * 4.2;

      // ---- Background: deep ocean radial ---------------------------
      const bgGrad = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
      // The very center becomes a near-perfect black "void" — the abyss.
      bgGrad.addColorStop(0,    '#000000');
      bgGrad.addColorStop(0.08, '#01060f');
      bgGrad.addColorStop(0.22, '#082035');
      bgGrad.addColorStop(0.55, '#0c3a5e');
      bgGrad.addColorStop(0.85, '#10557d');
      bgGrad.addColorStop(1,    '#0a2540');
      ctx2d.fillStyle = bgGrad;
      ctx2d.fillRect(0, 0, w, h);

      // ---- Spiral arms ---------------------------------------------
      // Each arm is a logarithmic spiral drawn with white foam strokes
      // that get more transparent / thinner as they reach the center.
      ctx2d.lineCap = 'round';
      ctx2d.lineJoin = 'round';
      const innerR = 8 * dpr;
      const outerR = baseRadius * 1.05;
      // Vertical flatten gives the spiral a slight overhead-camera tilt.
      const flatten = 0.78;

      for (const arm of arms) {
        ctx2d.beginPath();
        const turns = 3.8;
        const steps = 96;
        for (let i = 0; i <= steps; i++) {
          const ti = i / steps;
          const r = innerR + (outerR - innerR) * Math.pow(ti, 1.35);
          const ang = arm.phase + rotation + ti * turns * Math.PI * 2;
          const x = cx + r * Math.cos(ang);
          const y = cy + r * Math.sin(ang) * flatten;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        // Outer arm strokes are brightest; inner-arm strokes fade so the
        // hole at the center reads as truly black.
        const armGrad = ctx2d.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        armGrad.addColorStop(0,    'rgba(255,255,255,0)');
        armGrad.addColorStop(0.2,  'rgba(180,220,255,' + (0.05 * arm.bright) + ')');
        armGrad.addColorStop(0.6,  'rgba(220,235,255,' + (0.55 * arm.bright) + ')');
        armGrad.addColorStop(1,    'rgba(255,255,255,' + (0.85 * arm.bright) + ')');
        ctx2d.strokeStyle = armGrad;
        ctx2d.lineWidth = arm.width * dpr * (1.4 - t * 0.8);
        ctx2d.stroke();
      }

      // ---- Foam beads ----------------------------------------------
      // Specks of bright white scattered along the spiral arms — they
      // catch the eye and sell the "water spinning" effect.
      for (const f of foam) {
        const arm = arms[Math.floor(f.sparkle * ARMS) % ARMS];
        const r = innerR + (outerR - innerR) * Math.pow(f.armOffset, 1.4);
        const ang = arm.phase + rotation + f.armOffset * 3.8 * Math.PI * 2 + f.angleJitter;
        const x = cx + r * Math.cos(ang);
        const y = cy + r * Math.sin(ang) * flatten;
        const alpha = Math.min(1, (r / outerR) * 1.2) * (0.5 + f.sparkle * 0.5);
        ctx2d.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx2d.beginPath();
        ctx2d.arc(x, y, f.size * dpr, 0, Math.PI * 2);
        ctx2d.fill();
      }

      // ---- Center void halo + outer fade-to-black -----------------
      const voidGrad = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.25);
      voidGrad.addColorStop(0,    'rgba(0,0,0,1)');
      voidGrad.addColorStop(0.55, 'rgba(0,0,0,0.7)');
      voidGrad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx2d.fillStyle = voidGrad;
      ctx2d.fillRect(0, 0, w, h);

      // Final-quarter fade-to-black so the page seam is clean.
      if (t > 0.78) {
        const fadeT = (t - 0.78) / 0.22;
        ctx2d.fillStyle = `rgba(0,4,12,${(fadeT * fadeT).toFixed(3)})`;
        ctx2d.fillRect(0, 0, w, h);
      }

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        setActive(false);
        onDone?.();
        audioCtx?.close().catch(() => {});
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      audioCtx?.close().catch(() => {});
    };
  }, [durationMs, onDone]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: '#000814',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'block',
        }}
      />
    </div>
  );
}
