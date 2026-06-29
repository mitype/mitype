'use client';
// WaveIntro — full-screen ocean wave that breaks across the screen
// from right to left every time a user opens The Wave Feed.
//
// Renders entirely in a WebGL fragment shader. Mirror of the vortex
// approach used for The Current — single full-screen quad, all visual
// work happens in the shader, mediump precision so it stays smooth on
// phones, capped DPR to keep fill-rate manageable.
//
// What the shader does:
//   1. Compute polar / cartesian sample coords.
//   2. Animate a tall wave silhouette horizontally across the screen.
//   3. Render sky gradient above the wave, deep ocean below.
//   4. Apply procedural water surface noise to the wave's leading face.
//   5. Bright white foam crest along the top of the wave.
//   6. Spray particles + sky-side mist trailing behind the crest.
//   7. Subtle caustic shimmer underwater.
//   8. Final fade-to-black for a clean seam into the feed.
//
// Audio: synthesized wave-break whoosh — low rumble that crescendos
// into a high splash as the crest passes the camera, then trails off.

import { useEffect, useRef, useState } from 'react';

interface Props {
  durationMs?: number;
  onDone?: () => void;
}

const DEFAULT_DURATION = 2200;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision mediump float;

varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform float uProgress;

// ---- noise ----------------------------------------------------------
float hash21(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
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

// ---- wave shape -----------------------------------------------------
// The wave is a tall, narrow Gaussian arch translated horizontally as
// time progresses. We add some chaotic surface noise so the top of the
// wave reads as turbulent water, not a smooth bell curve.
float waveHeight(float x, float waveX, float time) {
  float dx = x - waveX;
  // Tall narrow profile: peak height ~1.0, falloff via Gaussian.
  float h = 0.95 * exp(-dx * dx * 1.4);
  // Asymmetric trailing edge — waves are steeper on the breaking
  // (leading) side and gentler on the trailing side. dx > 0 = trailing.
  if (dx > 0.0) h *= mix(1.0, 0.55, smoothstep(0.0, 0.6, dx));
  // Turbulence on the top edge so the silhouette ripples.
  float turbulence = (fbm(vec2(x * 4.0, time * 0.6)) - 0.5) * 0.08
                   * exp(-dx * dx * 2.0);
  return -0.5 + h + turbulence;
}

void main() {
  vec2 res = uRes;
  vec2 fragCoord = vUv * res;
  // Center-relative, aspect-normalized coords (p=(0,0) is center).
  vec2 p = (fragCoord - 0.5 * res) / min(res.x, res.y);
  // Wide aspect normalization so the wave reads as horizontal even on
  // tall phone screens.
  p.x *= res.x / min(res.x, res.y);

  // The wave's X center animates from offscreen-right to offscreen-left.
  float waveX = mix(1.6, -1.6, uProgress);

  // Wave top at this column.
  float wTop = waveHeight(p.x, waveX, uTime);

  // ---- 1. Sky + ocean base ---------------------------------------
  vec3 cSkyTop    = vec3(0.62, 0.72, 0.84);
  vec3 cSkyBottom = vec3(0.78, 0.82, 0.86);
  vec3 cOceanShallow = vec3(0.08, 0.42, 0.55);
  vec3 cOceanDeep    = vec3(0.01, 0.05, 0.12);
  vec3 cFoam        = vec3(0.98, 1.00, 1.00);

  vec3 sky = mix(cSkyTop, cSkyBottom, smoothstep(-0.5, 0.5, p.y));

  // Ocean color varies with "depth below wave top".
  float depth = max(0.0, wTop - p.y);
  vec3 ocean = mix(cOceanShallow, cOceanDeep, smoothstep(0.0, 1.2, depth));
  // Highlight along the leading face of the wave (cyan glow under crest).
  float face = smoothstep(0.0, 0.15, depth) * (1.0 - smoothstep(0.15, 0.45, depth));
  ocean += vec3(0.04, 0.30, 0.40) * face * smoothstep(0.6, 0.0, abs(p.x - waveX));

  // Which side of the wave silhouette are we on?
  float underwaterMask = smoothstep(0.005, -0.005, p.y - wTop);
  vec3 col = mix(sky, ocean, underwaterMask);

  // ---- 2. Underwater caustic shimmer ------------------------------
  float caustic = fbm(vec2(p.x * 5.0 + uTime * 0.7, p.y * 5.0));
  col += pow(caustic, 3.0) * 0.18 * underwaterMask * vec3(0.5, 0.85, 1.0);

  // ---- 3. Foam crest along the top edge ---------------------------
  float crestDist = abs(p.y - wTop);
  float crestThickness = 0.05 + 0.04 * smoothstep(0.8, 0.0, abs(p.x - waveX));
  float crest = 1.0 - smoothstep(0.0, crestThickness, crestDist);
  // Crest texture (foam isn't a flat line — it has bubbles).
  float crestTex = fbm(vec2(p.x * 25.0, uTime * 3.0));
  crest *= mix(0.7, 1.0, crestTex);
  col = mix(col, cFoam, crest * 0.95);

  // ---- 4. Spray + mist above the wave -----------------------------
  // Only above the wave top and within a horizontal radius of the peak.
  float aboveWave = max(0.0, p.y - wTop);
  float horizontalFalloff = smoothstep(1.8, 0.3, abs(p.x - waveX));
  if (aboveWave > 0.0 && aboveWave < 0.5) {
    float verticalFalloff = smoothstep(0.5, 0.0, aboveWave);
    // Fine spray pattern — high frequency moving fbm.
    float spray = fbm(vec2(p.x * 28.0 + uTime * 1.5, p.y * 28.0 + uTime));
    spray = pow(spray, 1.6);
    float sprayAlpha = spray * verticalFalloff * horizontalFalloff;
    col = mix(col, cFoam, sprayAlpha * 0.75);
    // Diffuse haze halo around the peak.
    col = mix(col, vec3(0.94, 0.96, 1.0), verticalFalloff * horizontalFalloff * 0.18);
  }

  // ---- 5. Surface ripple highlight at waterline -------------------
  // Bright thin line where the ocean meets the front of the wave.
  float surfaceLine = 1.0 - smoothstep(0.0, 0.012, abs(p.y - wTop));
  surfaceLine *= smoothstep(0.0, 0.5, abs(p.x - waveX) + 0.1);
  col += vec3(0.7, 0.9, 1.0) * surfaceLine * 0.25;

  // ---- 6. Bottom-of-screen ocean (always darker so far depths read deep)
  float depthFog = smoothstep(0.2, 0.8, p.y);
  col = mix(col, cOceanDeep, depthFog * 0.4 * underwaterMask);

  // ---- 7. Final fade-to-black for clean page seam -----------------
  if (uProgress > 0.85) {
    float fadeT = (uProgress - 0.85) / 0.15;
    col = mix(col, vec3(0.0, 0.0, 0.0), fadeT * fadeT);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

export function WaveIntro({ durationMs = DEFAULT_DURATION, onDone }: Props) {
  const [shown, setShown] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reduced = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    if (reduced) { setShown(false); onDone?.(); return; }
    const canvas = canvasRef.current;
    if (!canvas) { setShown(false); onDone?.(); return; }

    const gl = (canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false }) ||
                canvas.getContext('experimental-webgl', { antialias: true })) as WebGLRenderingContext | null;
    if (!gl) {
      console.warn('[WaveIntro] WebGL unavailable — skipping wave intro.');
      setShown(false); onDone?.(); return;
    }
    gl.getExtension('OES_standard_derivatives');

    function compile(type: number, src: string): WebGLShader | null {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[WaveIntro] shader compile:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { setShown(false); onDone?.(); return; }

    const prog = gl.createProgram();
    if (!prog) { setShown(false); onDone?.(); return; }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[WaveIntro] program link:', gl.getProgramInfoLog(prog));
      setShown(false); onDone?.(); return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes      = gl.getUniformLocation(prog, 'uRes');
    const uTime     = gl.getUniformLocation(prog, 'uTime');
    const uProgress = gl.getUniformLocation(prog, 'uProgress');

    // DPR=1 — fast and motion-blurred enough that high DPR is wasted.
    const dpr = 1;
    function resize() {
      if (!canvas || !gl) return;
      canvas.width  = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    // ---------- audio ----------
    // Wave-break whoosh: low rumble crescendos into a high crash at the
    // midpoint as the crest passes the camera, then trails off.
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
          ch[i] = last * 3.4;
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 3.5;
        // Frequency sweep that peaks at the wave crash midpoint.
        bp.frequency.setValueAtTime(120, ctx.currentTime);
        bp.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + sec * 0.5);
        bp.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + sec);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.30, ctx.currentTime + 0.15);
        gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + sec * 0.5);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + sec * 0.85);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + sec + 0.05);
        src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
        src.start();
        src.stop(ctx.currentTime + sec + 0.1);
      }
    } catch { /* silent */ }

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
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        done = true;
        setShown(false);
        onDone?.();
        audioCtx?.close().catch(() => {});
      }
    }
    raf = requestAnimationFrame(tick);

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      audioCtx?.close().catch(() => {});
      try {
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buf);
      } catch { /* ignore */ }
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
        background: '#0a1a2a',
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
