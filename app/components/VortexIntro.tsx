'use client';
// VortexIntro — WebGL fragment-shader vortex.
//
// Photoreal-style procedural water rendered entirely in a fragment
// shader on a single full-screen quad. Same family of techniques used
// in modern game water shaders.
//
// What the shader does per pixel:
//   1. Convert UV to polar coords, then apply a vortex transform whose
//      angular velocity grows toward the center (real whirlpool physics).
//   2. Sample 8 octaves of quintic-interpolated value noise with a
//      rotated-basis fbm for a non-axis-aligned natural look.
//   3. Double-domain-warp the surface — sample noise at coords offset
//      by another noise sample. This is what gives the water its
//      chaotic, organic, non-mathematical look.
//   4. Add an independently-moving caustic layer for the moving bright
//      sunlight-through-water streaks.
//   5. Mix four water colors (void, deep, mid, surface) by radius.
//   6. Foam = (spiral-arm height threshold) × (high-freq detail) ×
//      (radial mask). Foam color is brilliant near-white.
//   7. Screen-space normal from foam height derivatives, then Blinn-
//      Phong specular from an upper-right "sun." Plus directional rim
//      lighting on arms facing the sun.
//   8. Center void mask + outer vignette + final fade-to-black.

import { useEffect, useRef, useState } from 'react';

interface Props {
  durationMs?: number;
  onDone?: () => void;
}

const DEFAULT_DURATION = 2400;

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
precision highp float;

varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform float uProgress;

// ---- hash + noise + fbm ---------------------------------------------

// Better-distribution hash for cleaner noise.
float hash21(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

// Quintic-interpolation value noise — smoother than the standard cubic
// smoothstep, which makes the water look soft and "wet" instead of
// faceted.
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

// Rotated-basis fbm — at each octave, rotate the sample space ~37° so
// noise features don't align with the grid axes. Without this you get
// visible diamond patterns at low frequencies.
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 8; i++) {
    v += a * noise(p);
    p = rot * p * 2.04;
    a *= 0.5;
  }
  return v;
}

// ---- vortex coordinate transform ------------------------------------
// Logarithmic spiral PLUS an inverse-radius rotation term so the water
// near the center spins much faster than the outer water (genuine
// whirlpool behavior).
vec2 vortex(vec2 p, float time) {
  float r = length(p);
  float a = atan(p.y, p.x);
  a += -log(r + 0.001) * 1.8 - 0.45 / (r + 0.12) + time * 1.45;
  return vec2(r * cos(a), r * sin(a));
}

// ---- surface height field -------------------------------------------
// Double-domain-warped multi-octave fbm. The double warp is the trick
// that gives water its chaotic organic look — you sample noise at
// coordinates that were themselves offset by another noise sample.
float surface(vec2 p, float time) {
  vec2 v = vortex(p, time);
  vec2 q = vec2(fbm(v * 1.8 + vec2(0.0, time * 0.2)),
                fbm(v * 1.8 + vec2(5.3, 1.7) + time * 0.2));
  vec2 r = vec2(fbm(v * 1.8 + q * 4.0 + vec2(time * 0.3, 0.0)),
                fbm(v * 1.8 + q * 4.0 + vec2(8.3, 2.8)));
  float base = fbm(v * 2.6 + r * 3.5);
  float detail = fbm(v * 14.0 + r * 2.0 + time * 0.4);
  return base * 0.72 + detail * 0.28;
}

// ---- moving caustics ------------------------------------------------
// Two independently animated fbm layers, multiplied and threshold-cut
// to look like moving sunlight streaks underwater.
float caustics(vec2 p, float time) {
  vec2 v = vortex(p, time * 0.7);
  float c1 = fbm(v * 8.0 + vec2(time, time * 0.5));
  float c2 = fbm(v * 11.0 - vec2(time * 0.7, time * 0.3));
  float c = c1 * c2 * 2.6;
  return pow(smoothstep(0.45, 1.0, c), 2.0);
}

void main() {
  vec2 res = uRes;
  vec2 fragCoord = vUv * res;
  vec2 p = (fragCoord - 0.5 * res) / min(res.x, res.y);

  // Zoom: viewer falls into the vortex over the animation lifetime.
  float zoomEase = uProgress * uProgress * (3.0 - 2.0 * uProgress);
  float zoom = 0.78 + zoomEase * 6.0;
  p /= zoom;

  float dist = length(p);

  // ---- 1. Surface height -------------------------------------------
  float h = surface(p, uTime);

  // ---- 2. Caustic light streaks ------------------------------------
  float caust = caustics(p, uTime);

  // ---- 3. Base ocean color (radial) --------------------------------
  vec3 cVoid    = vec3(0.000, 0.005, 0.010);
  vec3 cDeep    = vec3(0.015, 0.085, 0.190);
  vec3 cMid     = vec3(0.055, 0.300, 0.500);
  vec3 cSurface = vec3(0.220, 0.620, 0.860);
  vec3 cFoam    = vec3(0.970, 0.990, 1.000);

  vec3 col = mix(cVoid,    cDeep,    smoothstep(0.04, 0.22, dist));
  col      = mix(col,      cMid,     smoothstep(0.18, 0.55, dist));
  col      = mix(col,      cSurface, smoothstep(0.50, 1.05, dist));

  // Subtle surface tint variation from the height field.
  col += (h - 0.5) * 0.24 * vec3(0.35, 0.62, 1.00);

  // Caustic light brighten — only visible in mid-radius water where
  // light would actually penetrate.
  float caustMask = smoothstep(0.18, 0.45, dist) * (1.0 - smoothstep(0.85, 1.15, dist));
  col += caust * 0.35 * caustMask * vec3(1.0, 1.0, 0.94);

  // ---- 4. Foam mask --------------------------------------------------
  // Foam where the height field is high, with a smaller-scale detail
  // noise to give the foam itself fine white-cap structure.
  float foamDetail = noise(vortex(p, uTime) * 30.0);
  float foamBase = pow(smoothstep(0.56, 0.86, h), 1.5);
  float radialMask = smoothstep(0.22, 0.42, dist) * (1.0 - smoothstep(1.0, 1.45, dist));
  float foam = foamBase * radialMask * mix(0.7, 1.0, foamDetail);
  col = mix(col, cFoam, foam);

  // ---- 5. Specular highlight (Blinn-Phong) -------------------------
  // Screen-space derivatives of the height field stand in for the real
  // surface normal. Blinn-Phong with a tight exponent gives a sharp
  // catchlight that sells the wet look.
  vec3 normal = normalize(vec3(-dFdx(h) * 80.0, -dFdy(h) * 80.0, 1.0));
  vec3 lightDir = normalize(vec3(0.55, -0.65, 0.55));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfVec = normalize(lightDir + viewDir);
  float spec = pow(max(0.0, dot(normal, halfVec)), 36.0);
  col += vec3(1.0, 0.96, 0.88) * spec * 1.2 * radialMask;

  // ---- 6. Rim light on outer arms facing the sun -------------------
  vec2 sunDir2 = normalize(vec2(0.7, -0.7));
  float rimDot = max(0.0, dot(normalize(p + 0.0001), sunDir2));
  col += vec3(1.0, 0.94, 0.80) * rimDot * 0.10 * smoothstep(0.30, 0.95, dist);

  // ---- 7. Bloom approximation around bright foam -------------------
  // Cheap single-tap bloom — bright foam gets a warm halo by sampling
  // the height field at an offset and adding back where it's bright.
  float halo = pow(smoothstep(0.45, 0.85, h), 4.0);
  col += halo * 0.18 * vec3(0.95, 0.98, 1.00) * radialMask;

  // ---- 8. Outer wave ripples (waves heading INTO the vortex) ------
  float outerRipples = sin(dist * 38.0 - uTime * 2.5 + atan(p.y, p.x) * 6.0);
  outerRipples = smoothstep(0.7, 0.97, outerRipples);
  col += outerRipples * 0.10 * smoothstep(0.90, 1.30, dist) * vec3(0.85, 0.95, 1.00);

  // ---- 9. Center void with strong falloff -------------------------
  float voidMask = smoothstep(0.0, 0.20, dist);
  col *= voidMask;
  col = mix(vec3(0.0), col, smoothstep(0.0, 0.35, dist));

  // ---- 10. Outer vignette -----------------------------------------
  col *= 1.0 - smoothstep(1.05, 1.55, dist);

  // ---- 11. Chromatic aberration on bright bits --------------------
  // Brighten the red channel slightly on bright pixels, the blue on
  // others — fakes the look of a lens slightly defocusing the spec.
  float bright = (col.r + col.g + col.b) / 3.0;
  if (bright > 0.6) {
    col.r *= 1.02;
    col.b *= 0.99;
  }

  // ---- 12. Final fade-to-black ------------------------------------
  if (uProgress > 0.8) {
    float fadeT = (uProgress - 0.8) / 0.2;
    col = mix(col, vec3(0.0, 0.015, 0.045), fadeT * fadeT);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------- component ---------------------------------------------------

export function VortexIntro({ durationMs = DEFAULT_DURATION, onDone }: Props) {
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
      console.warn('[VortexIntro] WebGL unavailable — skipping vortex.');
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
        console.error('[VortexIntro] shader compile:', gl.getShaderInfoLog(s));
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
      console.error('[VortexIntro] program link:', gl.getProgramInfoLog(prog));
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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      if (!canvas || !gl) return;
      canvas.width  = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    // ---------- audio ----------
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
        bp.Q.value = 4.5;
        bp.frequency.setValueAtTime(140, ctx.currentTime);
        bp.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + sec * 0.7);
        bp.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + sec);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0.34, ctx.currentTime + sec * 0.75);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + sec + 0.05);
        src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
        src.start();
        src.stop(ctx.currentTime + sec + 0.1);
      }
    } catch { /* silent */ }

    // ---------- animation loop ----------
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
