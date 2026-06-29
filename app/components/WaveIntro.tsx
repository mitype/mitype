'use client';
// WaveIntro — cinematic ocean-wave intro for The Wave Feed.
//
// PRIMARY PATH: plays a short MP4 of a real breaking wave. Procedural
// shaders have a hard ceiling on how "real" water can look; the only
// way to land photographic quality in a 2-3 second intro is to use
// actual wave footage. Drop your video file into `public/wave-intro.mp4`
// (or set NEXT_PUBLIC_WAVE_INTRO_URL to a hosted CDN URL) and this
// component will use it.
//
// WHERE TO GET A WAVE VIDEO:
//   - Pexels (https://www.pexels.com/search/videos/ocean%20wave/) — CC0
//   - Pixabay (https://pixabay.com/videos/search/ocean%20wave/) — CC0
//   - Mixkit (https://mixkit.co/free-stock-video/ocean/) — CC0
//   Look for a clip ~2-3 seconds long, vertical or square if possible,
//   showing a wave breaking from right to left (or rotate one that
//   breaks left-to-right in any editor). Compress to <2MB with HandBrake.
//
// FILE PATH:
//   Put the MP4 at `mitypee/public/wave-intro.mp4`. It'll be served at
//   `/wave-intro.mp4` automatically by Next.js. The component checks
//   that path first, falls back to the procedural shader if the video
//   fails to load (so the page never breaks).
//
// AUDIO: even when video plays, we still trigger our synthesized
// wave-break whoosh on top — that way the intro has audio even on
// platforms that mute video autoplay by default.

import { useEffect, useRef, useState } from 'react';

interface Props {
  durationMs?: number;
  onDone?: () => void;
  /** Override the video URL. Defaults to `/wave-intro.mp4` (drop your
   *  file at `public/wave-intro.mp4`) or the NEXT_PUBLIC_WAVE_INTRO_URL
   *  environment variable if set. */
  videoUrl?: string;
}

const DEFAULT_DURATION = 2600;
const DEFAULT_VIDEO_URL =
  process.env.NEXT_PUBLIC_WAVE_INTRO_URL || '/wave-intro.mp4';

export function WaveIntro({
  durationMs = DEFAULT_DURATION,
  onDone,
  videoUrl = DEFAULT_VIDEO_URL,
}: Props) {
  const [shown, setShown] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ---------- reduced-motion + lifecycle ----------
  useEffect(() => {
    const reduced = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    if (reduced) {
      setShown(false);
      onDone?.();
      return;
    }

    // ---------- audio (synthesized wave-break whoosh) ----------
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
          last = (last + 0.045 * w) / 1.045;
          ch[i] = last * 3.6;
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 3.0;
        bp.frequency.setValueAtTime(100, ctx.currentTime);
        bp.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + sec * 0.5);
        bp.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + sec);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 0.18);
        gain.gain.linearRampToValueAtTime(0.50, ctx.currentTime + sec * 0.5);
        gain.gain.linearRampToValueAtTime(0.20, ctx.currentTime + sec * 0.85);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + sec + 0.05);
        src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
        src.start();
        src.stop(ctx.currentTime + sec + 0.1);
      }
    } catch { /* silent */ }

    // ---------- master timeout — guarantees we close out even if the
    //            video stalls or the shader fallback never fires.
    const masterTimer = window.setTimeout(() => {
      setShown(false);
      onDone?.();
      audioCtx?.close().catch(() => {});
    }, durationMs);

    return () => {
      clearTimeout(masterTimer);
      audioCtx?.close().catch(() => {});
    };
  }, [durationMs, onDone]);

  // ---------- video event handlers ----------
  function handleVideoError() {
    console.warn('[WaveIntro] video failed to load — falling back to shader.');
    setVideoFailed(true);
  }
  function handleVideoEnded() {
    // The master timer will close us out anyway, but if the video is
    // shorter than durationMs we can stop early too.
    setShown(false);
    onDone?.();
  }

  // ---------- WebGL shader fallback ----------
  // Runs only if the video failed to load. Same translucent-volume
  // shader as before — better than a blank screen.
  useEffect(() => {
    if (!videoFailed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = (canvas.getContext('webgl', { antialias: true }) ||
                canvas.getContext('experimental-webgl', { antialias: true })) as WebGLRenderingContext | null;
    if (!gl) return;
    gl.getExtension('OES_standard_derivatives');

    function compile(type: number, src: string): WebGLShader | null {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    const vs = compile(gl.VERTEX_SHADER, FALLBACK_VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FALLBACK_FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,  -1, 1,  1, -1,  1, 1,
    ]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uProgress = gl.getUniformLocation(prog, 'uProgress');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const start = performance.now();
    let raf = 0;
    let done = false;
    function tick(now: number) {
      if (done || !gl || !canvas) return;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed / 1000);
      gl.uniform1f(uProgress, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
    };
  }, [videoFailed, durationMs]);

  if (!shown) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: '#0a1828',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {!videoFailed ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          muted
          playsInline
          preload="auto"
          onError={handleVideoError}
          onEnded={handleVideoEnded}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          style={{ width: '100vw', height: '100vh', display: 'block' }}
        />
      )}
      {/* Soft black vignette so the seam into the dark Wave feed reads
          cleanly regardless of the video's last frame. Fades up over
          the final 15% of the animation via CSS. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.5) 100%)',
          animation: `mitype-wave-fade ${durationMs}ms forwards`,
          pointerEvents: 'none',
        }}
      />
      <style>{`
        @keyframes mitype-wave-fade {
          0%, 80% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// WebGL shader fallback — used only if the video URL fails.
// ============================================================

const FALLBACK_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FALLBACK_FRAG = `
#extension GL_OES_standard_derivatives : enable
precision mediump float;
varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform float uProgress;
float hash21(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.04;
    a *= 0.5;
  }
  return v;
}
void main() {
  vec2 p = (vUv * uRes - 0.5 * uRes) / min(uRes.x, uRes.y);
  p.x *= uRes.x / min(uRes.x, uRes.y);
  float waveX = mix(2.0, -2.0, uProgress);
  float dx = p.x - waveX;
  float wTop = -0.55 + 1.05 * exp(-dx * dx * 1.25)
             + (fbm(vec2(p.x * 5.0, uTime * 0.7)) - 0.5) * 0.08 * exp(-dx * dx * 1.6);
  float depthInto = max(0.0, wTop - p.y);
  float translucency = exp(-depthInto * 1.7);
  vec3 cSky = mix(vec3(0.78, 0.85, 0.92), vec3(0.42, 0.55, 0.75), smoothstep(-0.4, 0.7, -p.y));
  vec3 cBody = mix(vec3(0.005, 0.04, 0.10), vec3(0.16, 0.85, 0.92), translucency);
  cBody += pow(smoothstep(0.55, 1.0, fbm(vec2(p.x * 7.0 + uTime, p.y * 7.0)) * 2.2), 1.7)
         * 0.35 * vec3(0.4, 0.85, 1.0) * translucency;
  float wMask = smoothstep(0.005, -0.005, p.y - wTop);
  vec3 col = mix(cSky, cBody, wMask);
  float crest = 1.0 - smoothstep(0.0, 0.07, abs(p.y - wTop));
  col = mix(col, vec3(0.98, 1.0, 1.0), crest * 0.95);
  if (uProgress > 0.85) {
    float fadeT = (uProgress - 0.85) / 0.15;
    col = mix(col, vec3(0.0), fadeT * fadeT);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;
