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
//
// IMPORTANT IMPLEMENTATION DETAIL:
//   Earlier versions of this component initialized state to `null` and
//   only rendered the canvas after a state update. That meant the
//   canvas ref was null when the effect tried to grab it, the animation
//   never started, and the user just saw a solid dark-blue screen.
//   The fix is to render the canvas on the FIRST render (shown=true
//   initial state) so the ref resolves on first useEffect call.

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Total duration of the animation in ms. */
  durationMs?: number;
  /** Called once the vortex finishes or is skipped. */
  onDone?: () => void;
}

const DEFAULT_DURATION = 1800;

export function VortexIntro({ durationMs = DEFAULT_DURATION, onDone }: Props) {
  // Start visible so the canvas mounts immediately and the ref is
  // available on the first useEffect pass.
  const [shown, setShown] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Honor reduced-motion: skip entirely.
    const reduced = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    if (reduced) {
      setShown(false);
      onDone?.();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      // Canvas should always exist by now. Bail gracefully.
      setShown(false);
      onDone?.();
      return;
    }
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) {
      setShown(false);
      onDone?.();
      return;
    }

    // ---------- audio ----------
    // Bandpass-filtered pink noise with a sweeping center frequency.
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

    // ---------- canvas size + DPR ----------
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      if (!canvas) return;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    // Pre-generate spiral arm offsets + foam-bead positions.
    const ARMS = 28;
    const arms = Array.from({ length: ARMS }, (_, i) => ({
      phase: (i / ARMS) * Math.PI * 2,
      width: 1.4 + (i % 3) * 0.8 + Math.random() * 1.0,
      bright: 0.45 + Math.random() * 0.55,
    }));
    const FOAM = 110;
    const foam = Array.from({ length: FOAM }, () => ({
      armOffset: Math.random(),
      angleJitter: (Math.random() - 0.5) * 0.32,
      size: 0.8 + Math.random() * 2.8,
      sparkle: Math.random(),
    }));

    const start = performance.now();
    let raf = 0;
    let done = false;

    function frame(now: number) {
      if (done || !ctx2d || !canvas) return;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Camera zoom: scales the whole spiral up over time so it feels
      // like the viewer is falling in. Easing makes the rate accelerate.
      const zoomEase = t * t * (3 - 2 * t);
      const zoom = 0.9 + zoomEase * 5.0;
      const baseRadius = Math.max(w, h) * 0.55 * zoom;
      // Faster spin as time progresses (water near the drain spins fastest).
      const rotation = Math.pow(elapsed / 1000, 1.25) * 4.6;

      // ---- Background: deep ocean radial ---------------------------
      const bgGrad = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
      bgGrad.addColorStop(0,    '#000000');
      bgGrad.addColorStop(0.07, '#01070f');
      bgGrad.addColorStop(0.22, '#0a2540');
      bgGrad.addColorStop(0.55, '#0e4870');
      bgGrad.addColorStop(0.85, '#14628f');
      bgGrad.addColorStop(1,    '#0a2540');
      ctx2d.fillStyle = bgGrad;
      ctx2d.fillRect(0, 0, w, h);

      // ---- Spiral arms ---------------------------------------------
      ctx2d.lineCap = 'round';
      ctx2d.lineJoin = 'round';
      const innerR = 12 * dpr;
      const outerR = baseRadius * 1.1;
      const flatten = 0.78; // slight overhead tilt

      for (const arm of arms) {
        ctx2d.beginPath();
        const turns = 3.6;
        const steps = 110;
        for (let i = 0; i <= steps; i++) {
          const ti = i / steps;
          const r = innerR + (outerR - innerR) * Math.pow(ti, 1.35);
          const ang = arm.phase + rotation + ti * turns * Math.PI * 2;
          const x = cx + r * Math.cos(ang);
          const y = cy + r * Math.sin(ang) * flatten;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        // Brighter outer ring, fading toward the void at the center.
        const armGrad = ctx2d.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        armGrad.addColorStop(0,    'rgba(255,255,255,0)');
        armGrad.addColorStop(0.22, `rgba(190,225,255,${(0.18 * arm.bright).toFixed(3)})`);
        armGrad.addColorStop(0.55, `rgba(225,240,255,${(0.85 * arm.bright).toFixed(3)})`);
        armGrad.addColorStop(1,    `rgba(255,255,255,${(0.95 * arm.bright).toFixed(3)})`);
        ctx2d.strokeStyle = armGrad;
        ctx2d.lineWidth = arm.width * dpr * (1.6 - t * 0.7);
        ctx2d.stroke();
      }

      // ---- Foam beads ----------------------------------------------
      for (const f of foam) {
        const arm = arms[Math.floor(f.sparkle * ARMS) % ARMS];
        const r = innerR + (outerR - innerR) * Math.pow(f.armOffset, 1.4);
        const ang = arm.phase + rotation + f.armOffset * 3.6 * Math.PI * 2 + f.angleJitter;
        const x = cx + r * Math.cos(ang);
        const y = cy + r * Math.sin(ang) * flatten;
        const alpha = Math.min(1, (r / outerR) * 1.4) * (0.55 + f.sparkle * 0.45);
        ctx2d.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx2d.beginPath();
        ctx2d.arc(x, y, f.size * dpr, 0, Math.PI * 2);
        ctx2d.fill();
      }

      // ---- Center void halo ----------------------------------------
      const voidR = baseRadius * 0.28;
      const voidGrad = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, voidR);
      voidGrad.addColorStop(0,    'rgba(0,0,0,1)');
      voidGrad.addColorStop(0.55, 'rgba(0,0,0,0.7)');
      voidGrad.addColorStop(1,    'rgba(0,0,0,0)');
      ctx2d.fillStyle = voidGrad;
      ctx2d.fillRect(0, 0, w, h);

      // ---- Final-quarter fade-to-black so the page seam is clean.
      if (t > 0.78) {
        const fadeT = (t - 0.78) / 0.22;
        ctx2d.fillStyle = `rgba(0,4,12,${(fadeT * fadeT).toFixed(3)})`;
        ctx2d.fillRect(0, 0, w, h);
      }

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        done = true;
        setShown(false);
        onDone?.();
        audioCtx?.close().catch(() => {});
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      audioCtx?.close().catch(() => {});
    };
  }, [durationMs, onDone]);

  if (!shown) return null;

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
