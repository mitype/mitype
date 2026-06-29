'use client';
// WaveIntro — cinematic ocean wave breaking across the screen.
//
// Major rewrite for photorealism. Where the previous version drew a
// flat silhouette with foam on top, this one renders the wave as a
// translucent volume with sub-surface scattering, glass-like
// translucency on thin parts, a breaking-lip shadow tube, atmospheric
// distance fog, and parallax spray. The result reads as a real wave
// you could photograph.
//
// Visual layers (back to front, all in one fragment shader pass):
//   1. Sky — multi-stop gradient with a soft sun glow.
//   2. Distant ocean horizon haze.
//   3. Wave body — translucent navy-to-cyan gradient driven by how
//      "thick" the wave is at each pixel. Thin parts of the wave glow
//      bright aqua because light passes through; thick parts stay deep.
//   4. Sub-surface caustic rays animated through the wave body.
//   5. Breaking-lip shadow tube — darker pocket beneath where the wave
//      is curling over.
//   6. Glass specular highlight on the wave's front face.
//   7. Crest foam — chunky multi-octave-noise band along the top edge.
//   8. Spray + mist above the wave with parallax falloff.
//   9. Atmospheric blue-tint fog over the deep background.
//  10. Final fade-to-black for the page seam.

import { useEffect, useRef, useState } from 'react';

interface Props {
  durationMs?: number;
  onDone?: () => void;
}

const DEFAULT_DURATION = 2600;

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
// Top edge of the wave silhouette at column x. The shape combines:
//   - A tall central peak (Gaussian)
//   - An asymmetric trailing edge (gentler slope behind, steeper face)
//   - Sub-peak ripples to suggest secondary crests
//   - Surface turbulence so the top edge isn't a smooth curve
float waveHeight(float x, float waveX, float time) {
  float dx = x - waveX;
  // Tall central peak.
  float peak = 1.05 * exp(-dx * dx * 1.25);
  // Steepen the leading face (dx < 0) and soften the trailing slope.
  if (dx > 0.0) peak *= mix(1.0, 0.42, smoothstep(0.0, 0.65, dx));
  // Secondary shoulder behind the peak.
  float shoulder = 0.28 * exp(-(dx + 0.55) * (dx + 0.55) * 4.0);
  // Surface turbulence — small chaotic ripples on the edge.
  float turb = (fbm(vec2(x * 5.5, time * 0.8)) - 0.5) * 0.10
             * exp(-dx * dx * 1.6);
  return -0.55 + peak + shoulder + turb;
}

// "Inner lip" — the line below the crest under which the wave is curling
// over. Used to compute a dark tube-shadow zone behind the breaking face.
float lipShadowMask(vec2 p, float waveX, float wTop) {
  float dx = p.x - waveX;
  // Only on the leading face (dx < 0) and just under the crest.
  float face = smoothstep(0.0, -0.55, dx);
  float underCrest = smoothstep(0.0, 0.32, wTop - p.y) * (1.0 - smoothstep(0.32, 0.55, wTop - p.y));
  return face * underCrest;
}

void main() {
  vec2 res = uRes;
  vec2 fragCoord = vUv * res;
  vec2 p = (fragCoord - 0.5 * res) / min(res.x, res.y);
  // Aspect-correct X so the wave reads wide even on tall phone screens.
  p.x *= res.x / min(res.x, res.y);

  // Wave horizontal center sweeps from offscreen-right to offscreen-left.
  float waveX = mix(2.0, -2.0, uProgress);
  // Wave top height at this column.
  float wTop = waveHeight(p.x, waveX, uTime);

  bool underWave = p.y < wTop;
  float depthInto = max(0.0, wTop - p.y);

  // ---- 1. Sky gradient + sun -----------------------------------
  vec3 cSkyTop   = vec3(0.42, 0.55, 0.75);
  vec3 cSkyHorz  = vec3(0.78, 0.85, 0.92);
  vec3 sky = mix(cSkyHorz, cSkyTop, smoothstep(-0.4, 0.7, -p.y));
  // Soft sun on the upper right.
  vec2 sunPos = vec2(0.85, -0.55);
  float sunDist = length(p - sunPos);
  sky += pow(max(0.0, 1.0 - sunDist * 1.5), 3.0) * vec3(1.0, 0.94, 0.78) * 0.55;
  sky += pow(max(0.0, 1.0 - sunDist * 0.6), 2.0) * vec3(1.0, 0.96, 0.85) * 0.15;

  // ---- 2. Distant ocean horizon haze --------------------------
  // Even outside the main wave, paint the lower half of the sky-plane
  // with a tinted blue so the horizon reads continuous.
  vec3 cHorizon = vec3(0.18, 0.36, 0.50);
  float horizonBlend = smoothstep(-0.15, 0.55, p.y) * (1.0 - smoothstep(0.6, 1.0, p.y));
  sky = mix(sky, cHorizon, horizonBlend * 0.55);

  // ---- 3. Wave body (translucent volume) ---------------------
  // Thin parts of the wave glow bright aqua because light passes
  // through; thick parts approach dark navy. This is the photoreal
  // "back-lit wave" effect.
  vec3 cWaveGlow = vec3(0.16, 0.85, 0.92);
  vec3 cWaveMid  = vec3(0.04, 0.35, 0.55);
  vec3 cWaveDeep = vec3(0.005, 0.04, 0.10);
  // translucency: 1.0 at very thin edges, 0 deep inside.
  float translucency = exp(-depthInto * 1.7);
  vec3 bodyShallow = mix(cWaveGlow, cWaveMid, smoothstep(0.0, 0.6, depthInto));
  vec3 bodyDeep    = mix(cWaveMid,  cWaveDeep, smoothstep(0.4, 1.6, depthInto));
  vec3 body = mix(bodyDeep, bodyShallow, translucency);

  // Inner subtle blue-green tint near the wave face.
  float faceTint = smoothstep(0.0, 0.4, depthInto) * (1.0 - smoothstep(0.4, 0.9, depthInto));
  body += vec3(-0.04, 0.06, 0.10) * faceTint;

  // ---- 4. Sub-surface caustic light shafts ------------------
  // Animated rays inside the wave body — what you see when the sun
  // is shining through the wall of water.
  vec2 causP = vec2(p.x * 7.0 + uTime * 0.8, p.y * 7.0 - uTime * 0.3);
  float c1 = fbm(causP);
  float c2 = fbm(causP * 1.7 + vec2(5.3, 1.9));
  float caustic = pow(smoothstep(0.55, 1.0, c1 * c2 * 2.2), 1.7);
  body += caustic * 0.35 * vec3(0.4, 0.85, 1.0) * translucency * smoothstep(0.0, 0.25, depthInto);

  // ---- 5. Breaking-lip shadow tube ---------------------------
  // Dark pocket on the leading face where the lip is curling over.
  float lipShade = lipShadowMask(p, waveX, wTop);
  body *= 1.0 - lipShade * 0.55;
  // A faint cyan rim along the lip-shadow boundary (light leaking
  // around the curl).
  body += smoothstep(0.45, 0.6, lipShade) * (1.0 - smoothstep(0.6, 0.85, lipShade)) * vec3(0.18, 0.7, 0.9) * 0.5;

  // ---- 6. Glass specular highlight on the wave face ---------
  // Use screen-space derivatives of the height field as a fake normal,
  // then Blinn-Phong with a sun direction.
  float hSample = depthInto;
  vec3 n = normalize(vec3(-dFdx(hSample) * 90.0, -dFdy(hSample) * 90.0, 1.0));
  vec3 lightDir = normalize(vec3(0.55, -0.65, 0.55));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfVec = normalize(lightDir + viewDir);
  float spec = pow(max(0.0, dot(n, halfVec)), 28.0);
  body += vec3(1.0, 0.97, 0.88) * spec * 1.4 * smoothstep(0.0, 0.5, depthInto);

  // Mix sky vs body by which side of the silhouette we are on.
  float wMask = smoothstep(0.005, -0.005, p.y - wTop);
  vec3 col = mix(sky, body, wMask);

  // ---- 7. Crest foam ----------------------------------------
  // Thick chunky band along the wave top, with multi-octave noise so
  // the foam reads as bubbles and froth instead of a flat stripe.
  float crestDist = abs(p.y - wTop);
  float crestThickness = 0.055 + 0.05 * smoothstep(1.0, 0.0, abs(p.x - waveX));
  float crest = 1.0 - smoothstep(0.0, crestThickness, crestDist);
  float crestTex = fbm(vec2(p.x * 22.0 + uTime, uTime * 2.5));
  float crestTex2 = fbm(vec2(p.x * 60.0, p.y * 60.0 + uTime * 4.0));
  crest *= mix(0.6, 1.0, crestTex);
  crest *= mix(0.85, 1.0, crestTex2);
  col = mix(col, vec3(0.98, 1.0, 1.0), crest * 0.95);

  // ---- 8. Spray + mist above the wave -----------------------
  float aboveWave = max(0.0, p.y - wTop);
  float horizFalloff = smoothstep(2.0, 0.4, abs(p.x - waveX));
  if (aboveWave > 0.0 && aboveWave < 0.7) {
    float vFalloff = smoothstep(0.7, 0.0, aboveWave);
    // Fine spray (high-frequency noise).
    float sprayFine = fbm(vec2(p.x * 35.0 + uTime * 1.8, p.y * 35.0 + uTime));
    sprayFine = pow(sprayFine, 1.7);
    // Heavier spray clumps (low-frequency).
    float sprayClumps = fbm(vec2(p.x * 8.0 + uTime, p.y * 8.0 - uTime * 0.5));
    sprayClumps = pow(smoothstep(0.55, 0.95, sprayClumps), 1.5);
    float sprayAlpha = (sprayFine * 0.7 + sprayClumps * 0.5) * vFalloff * horizFalloff;
    col = mix(col, vec3(1.0), sprayAlpha * 0.85);
    // Diffuse haze halo around the peak.
    col = mix(col, vec3(0.94, 0.97, 1.0), vFalloff * horizFalloff * 0.22);
  }

  // ---- 9. Surface waterline highlight ------------------------
  float surfaceLine = 1.0 - smoothstep(0.0, 0.010, abs(p.y - wTop));
  surfaceLine *= smoothstep(0.0, 0.5, abs(p.x - waveX) + 0.15);
  col += vec3(0.7, 0.92, 1.0) * surfaceLine * 0.30;

  // ---- 10. Underwater rim brightness along the leading face --
  // Bright thin band on the wave face where it transitions from
  // translucent to deep.
  float rimDist = abs(depthInto - 0.18);
  float rim = (1.0 - smoothstep(0.0, 0.10, rimDist)) * wMask
            * smoothstep(0.0, 0.6, abs(p.x - waveX) + 0.4);
  col += vec3(0.45, 0.85, 1.0) * rim * 0.45;

  // ---- 11. Final fade-to-black -------------------------------
  if (uProgress > 0.86) {
    float fadeT = (uProgress - 0.86) / 0.14;
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
    // Cinematic wave-break: low rumble crescendos into a roaring crash
    // at the midpoint as the crest passes the camera, then resolves
    // into the wash. Slightly louder than the previous version.
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
        background: '#0a1828',
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
