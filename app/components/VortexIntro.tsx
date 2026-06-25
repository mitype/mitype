'use client';
// VortexIntro — WebGL fragment-shader vortex.
//
// Earlier passes used Canvas2D. This rewrite renders the entire effect
// inside a GLSL fragment shader on a full-screen quad — the same
// pipeline modern game water shaders use. The shader runs once per
// pixel per frame on the GPU, which is the only way to get genuinely
// photoreal procedural water at 60fps on a phone.
//
// What the shader does, in order, per pixel:
//   1. Convert UV to polar coords (distance + angle).
//   2. Logarithmic-spiral coordinate warp — gives water the whirlpool
//      rotation that accelerates toward the center.
//   3. Domain-warp the warped coords through fbm noise so the surface
//      is chaotic instead of mathematically smooth.
//   4. Sample three octaves of fbm at different scales for water-
//      surface texture, mid-detail, and foam-frequency detail.
//   5. Mix three water colors (deep, mid, surface) using a radial
//      gradient — this is the underlying ocean color.
//   6. Compute foam = (spiral-arm threshold) × (high-frequency noise) ×
//      (radial mask). Foam is brightest white near outer rim and absent
//      near the void.
//   7. Compute a screen-space normal from foam height-field derivatives,
//      then a phong specular highlight from an upper-right "sun." This
//      catchlight is what sells the photoreal water look.
//   8. Apply the center void mask — pure black at center, gradient out.
//   9. Final-quarter fade-to-black for a clean page seam.
//
// Audio: synthesized whoosh, same Web-Audio approach as before.
// Reduced-motion: skip the whole thing.

import { useEffect, useRef, useState } from 'react';

interface Props {
  durationMs?: number;
  onDone?: () => void;
}

const DEFAULT_DURATION = 2200;

// ---------- shaders -----------------------------------------------------

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
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    v += amp * noise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return v;
}

// ---- whirlpool swirl --------------------------------------------------
// Logarithmic spiral: angle += k * log(radius). The further from center,
// the slower the rotation — exactly how real whirlpools behave.
vec2 swirl(vec2 p, float tightness, float spin) {
  float r = length(p);
  float a = atan(p.y, p.x);
  a += -log(r + 0.001) * tightness + spin;
  return vec2(r * cos(a), r * sin(a));
}

// Spiral-arm height field — used both for foam masking and to drive the
// screen-space normal for specular highlights.
float armField(vec2 p, float time) {
  vec2 s = swirl(p, 2.6, time * 1.4);
  // Domain warp: offset the sample by another noise sample for chaos.
  vec2 w = vec2(fbm(s * 3.0 + vec2(time * 0.3, 0.0)),
                fbm(s * 3.0 + vec2(0.0, time * 0.3) + 5.2));
  s += (w - 0.5) * 0.55;
  float detail = fbm(s * 6.0);
  float fine = fbm(s * 16.0 + time * 0.4);
  return detail * 0.7 + fine * 0.3;
}

void main() {
  vec2 res = uRes;
  vec2 fragCoord = vUv * res;
  // Center-relative, aspect-normalized coords. p=(0,0) is the center.
  vec2 p = (fragCoord - 0.5 * res) / min(res.x, res.y);

  // Animation zoom: scale the world coords down over time so the viewer
  // "falls into" the vortex (everything appears to grow).
  float zoomEase = uProgress * uProgress * (3.0 - 2.0 * uProgress);
  float zoom = 0.85 + zoomEase * 5.6;
  p /= zoom;

  float dist = length(p);

  // ---- 1. Water surface texture (swirled fbm) -----------------------
  float h = armField(p, uTime);

  // ---- 2. Base ocean color (radial gradient) ------------------------
  vec3 cVoid    = vec3(0.00, 0.00, 0.01);
  vec3 cDeep    = vec3(0.02, 0.10, 0.22);
  vec3 cMid     = vec3(0.06, 0.30, 0.50);
  vec3 cSurface = vec3(0.18, 0.55, 0.78);
  vec3 cFoam    = vec3(0.95, 0.98, 1.00);

  vec3 col = mix(cVoid,    cDeep,    smoothstep(0.05, 0.25, dist));
  col      = mix(col,      cMid,     smoothstep(0.20, 0.55, dist));
  col      = mix(col,      cSurface, smoothstep(0.50, 1.10, dist));

  // Add the water-surface texture as subtle blue ripple variation.
  col += (h - 0.5) * 0.20 * vec3(0.4, 0.7, 1.0);

  // ---- 3. Foam mask --------------------------------------------------
  // Foam appears where the arm-field is bright AND we are not in the
  // center void AND we are not past the outer rim. Mixed in as bright
  // white.
  float foamSpiral = pow(smoothstep(0.55, 0.85, h), 1.4);
  float radialMask = smoothstep(0.18, 0.40, dist) * (1.0 - smoothstep(1.0, 1.4, dist));
  float foam = foamSpiral * radialMask;
  col = mix(col, cFoam, foam);

  // ---- 4. Specular highlight from upper-right light -----------------
  // Use screen-space derivatives of the arm field to fake a surface
  // normal. Dot it with a light direction; pow for a tight catchlight.
  vec3 normal = normalize(vec3(-dFdx(h) * 60.0, -dFdy(h) * 60.0, 1.0));
  vec3 lightDir = normalize(vec3(0.55, -0.55, 0.62));
  float spec = pow(max(0.0, dot(normal, lightDir)), 18.0);
  col += vec3(1.0, 0.96, 0.86) * spec * 0.8 * radialMask;

  // Soft directional brightening so arms facing the sun read warmer.
  float dirBright = max(0.0, dot(normalize(p + 0.001), normalize(vec2(0.7, -0.7))));
  col += vec3(1.0, 0.92, 0.78) * dirBright * 0.05 * smoothstep(0.2, 0.9, dist);

  // ---- 5. Outer wave ripples (waves heading into the vortex) -------
  float outerRipples = sin(dist * 32.0 - uTime * 2.0 + atan(p.y, p.x) * 6.0);
  outerRipples = smoothstep(0.6, 0.95, outerRipples);
  col += outerRipples * 0.08 * smoothstep(0.85, 1.3, dist) * vec3(0.8, 0.95, 1.0);

  // ---- 6. Center void --------------------------------------------
  float voidMask = smoothstep(0.0, 0.22, dist);
  col *= voidMask;
  // Inner halo to keep the black abyss reading deep, not flat.
  col = mix(vec3(0.0), col, smoothstep(0.0, 0.35, dist));

  // ---- 7. Outer vignette so the canvas seams cleanly with the page --
  col *= 1.0 - smoothstep(1.05, 1.55, dist);

  // ---- 8. Final fade-to-black ----------------------------------------
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

    // ---------- WebGL setup ----------
    const gl = (canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false }) ||
                canvas.getContext('experimental-webgl', { antialias: true })) as WebGLRenderingContext | null;
    if (!gl) {
      console.warn('[VortexIntro] WebGL unavailable — skipping vortex.');
      setShown(false); onDone?.(); return;
    }
    // Required for dFdx/dFdy in fragment shader.
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

    // Full-screen quad.
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
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + sec * 0.75);
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
      // Best-effort GL cleanup.
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
