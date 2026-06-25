'use client';
// VortexIntro — 1.4-second swirl that plays the first time a user enters
// The Current per session. Renders an SVG vortex spinning + zooming
// toward the viewer with synchronized Web Audio whoosh.
//
// Behavior:
//   - Plays once per browser tab session (sessionStorage flag).
//   - Audio is synthesized in the browser (no asset to ship).
//   - The audio play is triggered as a direct consequence of the user
//     navigating here from the Enter The Current button, so browser
//     autoplay rules permit it.
//   - prefers-reduced-motion: skips the animation entirely and lands
//     immediately in the feed.
//
// Use this component at the top of the /currents page tree. It fades out
// and unmounts itself.

import { useEffect, useState } from 'react';

interface Props {
  /** Optional override of the sessionStorage key — useful if you want
   *  to force-replay the intro from a debug toggle. */
  storageKey?: string;
  /** Called once the vortex finishes (or is skipped). The feed can use
   *  this to gate first-render content fades. */
  onDone?: () => void;
}

const DEFAULT_KEY = 'mitype-current-vortex-played-v1';
const DURATION_MS = 1400;
const REDUCED_MOTION =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export function VortexIntro({ storageKey = DEFAULT_KEY, onDone }: Props) {
  const [active, setActive] = useState<boolean | null>(null);

  useEffect(() => {
    // Check whether we've already played this session.
    let played = false;
    try {
      played = window.sessionStorage.getItem(storageKey) === '1';
    } catch {
      // sessionStorage unavailable — play it anyway, no big deal.
    }
    if (played || REDUCED_MOTION) {
      setActive(false);
      onDone?.();
      return;
    }
    setActive(true);
    try { window.sessionStorage.setItem(storageKey, '1'); } catch {}

    // Synthesize the vortex sound: bandpass-filtered pink noise with a
    // sweeping center frequency for a watery whoosh. Wrapped in try/catch
    // because some browsers throw if the audio context is not allowed.
    let audioCtx: AudioContext | null = null;
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        audioCtx = new Ctor();
        const ctx = audioCtx!;
        const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.6), ctx.sampleRate);
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
        bp.frequency.setValueAtTime(180, ctx.currentTime);
        bp.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.9);
        bp.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 1.4);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 0.18);
        gain.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 0.9);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);

        src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
        src.start();
        src.stop(ctx.currentTime + 1.6);
      }
    } catch {
      // Silent — visuals still play.
    }

    const t = setTimeout(() => {
      setActive(false);
      onDone?.();
      audioCtx?.close().catch(() => {});
    }, DURATION_MS);
    return () => {
      clearTimeout(t);
      audioCtx?.close().catch(() => {});
    };
  }, [storageKey, onDone]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: 'radial-gradient(circle at 50% 50%, #0a2540 0%, #000814 70%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        animation: `mitype-vortex-fadeout 0.35s ease-out ${(DURATION_MS - 350) / 1000}s forwards`,
        pointerEvents: 'none',
      }}
    >
      <svg
        viewBox="-200 -200 400 400"
        width="100%"
        height="100%"
        style={{
          maxWidth: 720,
          maxHeight: 720,
          animation: 'mitype-vortex-spin 1.4s cubic-bezier(0.2, 0.7, 0.3, 1) forwards',
          transformOrigin: 'center',
        }}
      >
        <defs>
          <radialGradient id="vx-rim" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.95)" />
            <stop offset="40%"  stopColor="rgba(120,210,255,0.65)" />
            <stop offset="100%" stopColor="rgba(10,37,64,0)" />
          </radialGradient>
        </defs>
        {/* Concentric rings, each rotated slightly. Together they read
            as a vortex spinning into the void at the center. */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const r = 30 + i * 22;
          return (
            <ellipse
              key={i}
              cx="0" cy="0"
              rx={r}
              ry={r * 0.62}
              fill="none"
              stroke="url(#vx-rim)"
              strokeWidth={2.2 - i * 0.18}
              opacity={1 - i * 0.08}
              transform={`rotate(${i * 14}) scale(${1 + i * 0.02})`}
            />
          );
        })}
        {/* The pull-point. Brightest at the center. */}
        <circle cx="0" cy="0" r="8" fill="rgba(255,255,255,0.9)" />
      </svg>
      <style>{`
        @keyframes mitype-vortex-spin {
          0%   { transform: scale(0.4) rotate(0deg); opacity: 0.3; filter: blur(6px); }
          25%  { opacity: 1; filter: blur(0); }
          100% { transform: scale(3.2) rotate(540deg); opacity: 0; filter: blur(2px); }
        }
        @keyframes mitype-vortex-fadeout {
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
