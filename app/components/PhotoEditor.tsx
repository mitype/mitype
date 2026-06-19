'use client';
// Self-contained photo editor for profile pictures and gallery photos.
//
// Inputs : a File (or URL via re-edit flow) + onSave(blob)/onCancel callbacks.
// Output : a JPEG Blob with all edits baked in (crop, rotation, flip,
//          color adjustments, filter preset, beauty effects).
//
// Implementation is pure-canvas — no external image-editing dependencies.
// Live preview uses CSS-like filter strings on a draw canvas; on Save we
// re-render at native resolution into a new canvas and export to Blob.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  file: File | null;
  /** Re-edit flow: pass a URL instead of (or in addition to) a File. */
  imageUrl?: string;
  /** Default aspect lock when opening. 'square' for avatars. */
  initialAspect?: AspectKey;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

type AspectKey = 'free' | '1:1' | '3:4' | '4:5' | '16:9';
const ASPECTS: { key: AspectKey; label: string; ratio: number | null }[] = [
  { key: '1:1', label: '1:1', ratio: 1 },
  { key: '3:4', label: '3:4', ratio: 3 / 4 },
  { key: '4:5', label: '4:5', ratio: 4 / 5 },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
  { key: 'free', label: 'Free', ratio: null },
];

type TabKey = 'crop' | 'adjust' | 'filters' | 'beauty';

interface Crop {
  x: number; y: number; w: number; h: number; // in source-pixel coords
}

interface Filter {
  key: string;
  label: string;
  css: string;
}
const FILTERS: Filter[] = [
  { key: 'none',   label: 'Natural',     css: 'none' },
  { key: 'warm',   label: 'Warm Cinema', css: 'sepia(0.18) saturate(1.25) contrast(1.08) brightness(1.02)' },
  { key: 'cool',   label: 'Cool Tone',   css: 'hue-rotate(-10deg) saturate(1.1) brightness(1.04)' },
  { key: 'moody',  label: 'Moody',       css: 'contrast(1.2) saturate(0.85) brightness(0.93)' },
  { key: 'bw',     label: 'B&W',         css: 'grayscale(1) contrast(1.12)' },
  { key: 'sepia',  label: 'Sepia',       css: 'sepia(0.85) contrast(1.05) saturate(1.1)' },
  { key: 'faded',  label: 'Faded Film',  css: 'saturate(0.78) contrast(0.92) brightness(1.06) sepia(0.08)' },
  { key: 'glow',   label: 'Soft Glow',   css: 'brightness(1.12) saturate(0.95) contrast(0.95)' },
];

const MAX_OUTPUT_DIM = 2000; // never produce bigger than this on either side

export function PhotoEditor({ file, imageUrl, initialAspect = '1:1', onSave, onCancel }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tab, setTab] = useState<TabKey>('crop');

  // Crop state — stored in source pixel coordinates.
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 0, h: 0 });
  const [aspect, setAspect] = useState<AspectKey>(initialAspect);

  // Transform state
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Adjustments
  const [brightness, setBrightness] = useState(100); // 50..150
  const [contrast,   setContrast]   = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth,     setWarmth]     = useState(0);   // -100..100
  const [exposure,   setExposure]   = useState(0);   // -50..50, maps to brightness

  // Filter preset
  const [filterKey, setFilterKey] = useState<string>('none');

  // Beauty
  const [smooth,   setSmooth]   = useState(0);  // 0..100 — Gaussian blur amount
  const [glow,     setGlow]     = useState(0);  // 0..100 — bright glow overlay
  const [vignette, setVignette] = useState(0);  // 0..100 — radial darken
  const [sharpen,  setSharpen]  = useState(0);  // 0..100

  const [saving, setSaving] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  // Outer container with the FIXED layout size — we measure this for
  // canvas sizing instead of the canvas's own parent (which would size
  // to the canvas, creating a feedback loop that shrinks the photo
  // on every render).
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  // Triggers a preview re-render whenever the viewport / preview area
  // resizes (rotation, soft keyboard appearing, etc.).
  const [previewVersion, setPreviewVersion] = useState(0);
  // Only render the portal after mount so SSR doesn't try to access document.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // -----------------------------------------------------------------
  // Load the source image once.
  // -----------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const url = file ? URL.createObjectURL(file) : imageUrl;
    if (!url) return;
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => {
      if (cancelled) return;
      setImg(i);
      // Initialize the crop to the largest centered rect that fits the
      // aspect lock — defaults to 1:1 (square) for profile-picture flows.
      const initial = initialCenteredCrop(i.naturalWidth, i.naturalHeight, aspect);
      setCrop(initial);
    };
    i.onerror = () => {
      console.error('[PhotoEditor] could not load source image');
    };
    i.src = url;
    return () => {
      cancelled = true;
      if (file) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, imageUrl]);

  // When the user changes aspect lock, reset to the largest centered
  // crop of that aspect in the full image. This is predictable and
  // prevents the progressive-shrinking bug where re-clamping the
  // previous crop kept making it smaller each time.
  useEffect(() => {
    if (!img) return;
    setCrop(initialCenteredCrop(img.naturalWidth, img.naturalHeight, aspect));
  }, [aspect, img]);

  // -----------------------------------------------------------------
  // Build the combined CSS filter string used by both preview + Save.
  // -----------------------------------------------------------------
  const cssFilter = useMemo(() => {
    const presetCss = FILTERS.find((f) => f.key === filterKey)?.css ?? 'none';
    // exposure adds to brightness multiplicatively (each 1 → +1%)
    const brightnessFactor = (brightness / 100) * (1 + exposure / 100);
    const parts: string[] = [];
    if (presetCss !== 'none') parts.push(presetCss);
    parts.push(`brightness(${brightnessFactor.toFixed(3)})`);
    parts.push(`contrast(${(contrast / 100).toFixed(3)})`);
    parts.push(`saturate(${(saturation / 100).toFixed(3)})`);
    // warmth via subtle hue rotation
    if (warmth !== 0) {
      const hueDeg = -warmth * 0.18;
      const warmSat = 1 + Math.abs(warmth) * 0.0015;
      parts.push(`hue-rotate(${hueDeg.toFixed(2)}deg)`);
      parts.push(`saturate(${warmSat.toFixed(3)})`);
    }
    // smooth (beauty) — slight blur on the whole image
    if (smooth > 0) {
      parts.push(`blur(${(smooth * 0.012).toFixed(2)}px)`);
    }
    return parts.join(' ');
  }, [brightness, contrast, saturation, warmth, exposure, filterKey, smooth]);

  // Watch the preview area for size changes (window resize, orientation
  // change, soft keyboard) and re-render the preview canvas to match.
  useEffect(() => {
    const area = previewAreaRef.current;
    if (!area || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(() => {
      setPreviewVersion((v) => v + 1);
    });
    obs.observe(area);
    return () => obs.disconnect();
  }, []);

  // -----------------------------------------------------------------
  // Live preview: render the (transformed + cropped) image into the
  // preview canvas every time inputs change.
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!img || !previewCanvasRef.current || !previewAreaRef.current) return;
    const canvas = previewCanvasRef.current;
    const area = previewAreaRef.current;

    // IMPORTANT: measure the OUTER preview area (which has a fixed
    // flex:1 layout size), NOT canvas.parentElement, because the
    // immediate parent sizes to the canvas — measuring it would cause
    // the canvas to shrink on every render.
    const maxW = Math.max(120, area.clientWidth - 24);
    const maxH = Math.max(120, area.clientHeight - 24);
    const srcW = (rotation === 90 || rotation === 270) ? img.naturalHeight : img.naturalWidth;
    const srcH = (rotation === 90 || rotation === 270) ? img.naturalWidth : img.naturalHeight;
    const scale = Math.min(maxW / srcW, maxH / srcH, 1);
    const pw = Math.max(1, Math.round(srcW * scale));
    const ph = Math.max(1, Math.round(srcH * scale));

    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, pw, ph);
    ctx.save();
    (ctx as any).filter = cssFilter;
    // Move origin to canvas center, apply rotation + flip, then draw.
    ctx.translate(pw / 2, ph / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    const drawW = (rotation === 90 || rotation === 270) ? ph : pw;
    const drawH = (rotation === 90 || rotation === 270) ? pw : ph;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Glow: bright additive overlay on the preview
    if (glow > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,240,210,${glow * 0.004})`;
      ctx.fillRect(0, 0, pw, ph);
      ctx.restore();
    }

    // Sharpen via a simple 3x3 convolution
    if (sharpen > 0) {
      applySharpen(ctx, pw, ph, sharpen);
    }

    // Vignette: radial dark overlay
    if (vignette > 0) {
      const grad = ctx.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * 0.35, pw / 2, ph / 2, Math.max(pw, ph) * 0.7);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${(vignette * 0.005).toFixed(3)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, pw, ph);
    }
  }, [img, rotation, flipH, flipV, cssFilter, glow, sharpen, vignette, previewVersion]);

  // -----------------------------------------------------------------
  // Crop drag handles (computed in source pixels, drawn over the preview).
  // -----------------------------------------------------------------
  function previewToSource(px: number, py: number) {
    if (!img || !previewCanvasRef.current) return { x: 0, y: 0 };
    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = (px - rect.left) / rect.width;
    const sy = (py - rect.top) / rect.height;
    return {
      x: clamp(sx * img.naturalWidth, 0, img.naturalWidth),
      y: clamp(sy * img.naturalHeight, 0, img.naturalHeight),
    };
  }

  // The crop rectangle drawn on screen — in CSS pixel coordinates
  // relative to the preview canvas.
  const cropRect = useMemo(() => {
    if (!img) return null;
    return {
      leftPct: (crop.x / img.naturalWidth) * 100,
      topPct: (crop.y / img.naturalHeight) * 100,
      widthPct: (crop.w / img.naturalWidth) * 100,
      heightPct: (crop.h / img.naturalHeight) * 100,
    };
  }, [crop, img]);

  // -----------------------------------------------------------------
  // Drag handlers — corner, edge, move.
  // -----------------------------------------------------------------
  function onCropMouseDown(e: React.PointerEvent, mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') {
    if (!img) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const startCrop = { ...crop };
    const start = previewToSource(e.clientX, e.clientY);
    const ar = ASPECTS.find((a) => a.key === aspect)?.ratio ?? null;

    function onMove(ev: PointerEvent) {
      const current = previewToSource(ev.clientX, ev.clientY);
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      let next = { ...startCrop };
      const iw = img!.naturalWidth;
      const ih = img!.naturalHeight;

      if (mode === 'move') {
        next.x = clamp(startCrop.x + dx, 0, iw - startCrop.w);
        next.y = clamp(startCrop.y + dy, 0, ih - startCrop.h);
      } else {
        if (mode.includes('w')) {
          next.x = clamp(startCrop.x + dx, 0, startCrop.x + startCrop.w - 20);
          next.w = startCrop.w - (next.x - startCrop.x);
        }
        if (mode.includes('e')) {
          next.w = clamp(startCrop.w + dx, 20, iw - startCrop.x);
        }
        if (mode.includes('n')) {
          next.y = clamp(startCrop.y + dy, 0, startCrop.y + startCrop.h - 20);
          next.h = startCrop.h - (next.y - startCrop.y);
        }
        if (mode.includes('s')) {
          next.h = clamp(startCrop.h + dy, 20, ih - startCrop.y);
        }
        // Enforce aspect ratio when locked, recomputing height from width.
        if (ar) {
          next.h = next.w / ar;
          if (next.y + next.h > ih) {
            next.h = ih - next.y;
            next.w = next.h * ar;
          }
        }
      }
      setCrop(next);
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // -----------------------------------------------------------------
  // Reset every edit back to defaults. Always-available escape hatch
  // from the header so a user can recover from any state.
  // -----------------------------------------------------------------
  function resetAll() {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setExposure(0);
    setFilterKey('none');
    setSmooth(0);
    setGlow(0);
    setSharpen(0);
    setVignette(0);
    setAspect(initialAspect);
    if (img) {
      setCrop(initialCenteredCrop(img.naturalWidth, img.naturalHeight, initialAspect));
    }
  }

  // -----------------------------------------------------------------
  // Save: bake everything into a fresh canvas and emit a JPEG Blob.
  // -----------------------------------------------------------------
  async function handleSave() {
    if (!img) return;
    setSaving(true);
    try {
      const blob = await renderFinal(img, {
        crop, rotation, flipH, flipV,
        cssFilter, glow, sharpen, vignette,
      });
      onSave(blob);
    } finally {
      setSaving(false);
    }
  }

  // Render through a portal so the editor lives at document.body level,
  // OUTSIDE any parent <form>. Critical because PhotoManager is used
  // inside /edit-profile's form: without this, a missing type="button"
  // anywhere in the editor would submit that form and unmount the
  // editor mid-edit.
  if (!mounted) return null;

  const ui = (
    <div
      data-no-swipe-back="true"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        background: '#0a0604',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'max(14px, env(safe-area-inset-top)) 16px 12px',
        background: 'rgba(0,0,0,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        gap: 8,
      }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flex: 1,
          justifyContent: 'center',
        }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Edit Photo</div>
          <button
            type="button"
            onClick={resetAll}
            aria-label="Reset all edits"
            title="Reset all edits"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: 100,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ↺ Reset
          </button>
        </div>
        <button type="button" onClick={handleSave} disabled={saving || !img} style={primaryBtn}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>

      {/* Preview */}
      <div ref={previewAreaRef} style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        overflow: 'hidden',
        background: 'radial-gradient(circle at center, #1a1208, #0a0604)',
        minHeight: 240,
      }}>
        {!img && (
          <div style={{ color: 'rgba(255,255,255,0.5)' }}>Loading photo…</div>
        )}
        {img && (
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <canvas
              ref={previewCanvasRef}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: 14,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            />
            {/* Crop overlay only in Crop tab. */}
            {tab === 'crop' && cropRect && (
              <div
                ref={cropFrameRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                }}
              >
                {/* Outside-mask darken */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.55)',
                  clipPath: `polygon(
                    0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                    ${cropRect.leftPct}% ${cropRect.topPct}%,
                    ${cropRect.leftPct}% ${cropRect.topPct + cropRect.heightPct}%,
                    ${cropRect.leftPct + cropRect.widthPct}% ${cropRect.topPct + cropRect.heightPct}%,
                    ${cropRect.leftPct + cropRect.widthPct}% ${cropRect.topPct}%,
                    ${cropRect.leftPct}% ${cropRect.topPct}%
                  )`,
                }} />
                {/* Crop rectangle */}
                <div
                  onPointerDown={(e) => onCropMouseDown(e, 'move')}
                  style={{
                    position: 'absolute',
                    left: `${cropRect.leftPct}%`,
                    top: `${cropRect.topPct}%`,
                    width: `${cropRect.widthPct}%`,
                    height: `${cropRect.heightPct}%`,
                    border: '2px solid white',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                    pointerEvents: 'auto',
                    cursor: 'move',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Rule-of-thirds guides */}
                  <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
                  <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
                  <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
                  <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
                  {/* Drag handles */}
                  {(['nw','ne','sw','se','n','s','e','w'] as const).map((m) => (
                    <span
                      key={m}
                      onPointerDown={(e) => { e.stopPropagation(); onCropMouseDown(e, m); }}
                      style={cornerHandleStyle(m)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 8px 4px',
        background: 'rgba(20,12,4,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        {(['crop','adjust','filters','beauty'] as TabKey[]).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => setTab(k)}
            style={tabBtn(tab === k)}
          >
            {tabIcon(k)} <span style={{ marginLeft: 6 }}>{tabLabel(k)}</span>
          </button>
        ))}
      </nav>

      {/* Tab body */}
      <div style={{
        background: '#0a0604',
        padding: '14px 16px max(20px, env(safe-area-inset-bottom)) 16px',
        maxHeight: '38vh',
        overflowY: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {tab === 'crop' && (
          <div>
            <Row label="Aspect ratio">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ASPECTS.map((a) => (
                  <Chip key={a.key} active={a.key === aspect} onClick={() => setAspect(a.key)}>{a.label}</Chip>
                ))}
              </div>
            </Row>
            <Row label="Rotate & flip">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Chip onClick={() => setRotation(((rotation + 270) % 360) as 0 | 90 | 180 | 270)}>↺ 90°</Chip>
                <Chip onClick={() => setRotation(((rotation + 90) % 360) as 0 | 90 | 180 | 270)}>↻ 90°</Chip>
                <Chip active={flipH} onClick={() => setFlipH(!flipH)}>⇄ Flip H</Chip>
                <Chip active={flipV} onClick={() => setFlipV(!flipV)}>⇅ Flip V</Chip>
                <Chip onClick={() => {
                  setRotation(0); setFlipH(false); setFlipV(false);
                  if (img) setCrop(initialCenteredCrop(img.naturalWidth, img.naturalHeight, aspect));
                }}>Reset</Chip>
              </div>
            </Row>
          </div>
        )}

        {tab === 'adjust' && (
          <div>
            <Slider label="Brightness" value={brightness} setValue={setBrightness} min={50} max={150} reset={100} />
            <Slider label="Contrast"   value={contrast}   setValue={setContrast}   min={50} max={150} reset={100} />
            <Slider label="Saturation" value={saturation} setValue={setSaturation} min={0}  max={200} reset={100} />
            <Slider label="Warmth"     value={warmth}     setValue={setWarmth}     min={-100} max={100} reset={0} />
            <Slider label="Exposure"   value={exposure}   setValue={setExposure}   min={-50}  max={50}  reset={0} />
          </div>
        )}

        {tab === 'filters' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <Chip key={f.key} active={filterKey === f.key} onClick={() => setFilterKey(f.key)}>
                {f.label}
              </Chip>
            ))}
          </div>
        )}

        {tab === 'beauty' && (
          <div>
            <Slider label="Smooth" value={smooth} setValue={setSmooth} min={0} max={100} reset={0} />
            <Slider label="Glow"   value={glow}   setValue={setGlow}   min={0} max={100} reset={0} />
            <Slider label="Sharpen" value={sharpen} setValue={setSharpen} min={0} max={100} reset={0} />
            <Slider label="Vignette" value={vignette} setValue={setVignette} min={0} max={100} reset={0} />
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}

// ----- helpers -----

function initialCenteredCrop(iw: number, ih: number, aspectKey: AspectKey): Crop {
  const ar = ASPECTS.find((a) => a.key === aspectKey)?.ratio;
  if (!ar) return { x: 0, y: 0, w: iw, h: ih };
  let w = Math.min(iw, ih * ar);
  let h = w / ar;
  if (h > ih) { h = ih; w = h * ar; }
  return { x: (iw - w) / 2, y: (ih - h) / 2, w, h };
}

function fitCropToAspect(prev: Crop, iw: number, ih: number, aspectKey: AspectKey): Crop {
  const ar = ASPECTS.find((a) => a.key === aspectKey)?.ratio;
  if (!ar) return prev;
  // Try to keep the crop's center, snap to the new ratio.
  const cx = prev.x + prev.w / 2;
  const cy = prev.y + prev.h / 2;
  let w = Math.min(prev.w, prev.h * ar);
  let h = w / ar;
  if (h > ih) { h = ih; w = h * ar; }
  if (w > iw) { w = iw; h = w / ar; }
  let x = cx - w / 2;
  let y = cy - h / 2;
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > iw) x = iw - w;
  if (y + h > ih) y = ih - h;
  return { x, y, w, h };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

interface RenderArgs {
  crop: Crop;
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  cssFilter: string;
  glow: number;
  sharpen: number;
  vignette: number;
}

async function renderFinal(img: HTMLImageElement, a: RenderArgs): Promise<Blob> {
  // 1) Apply rotation to a working canvas — at full source resolution.
  const rot = a.rotation;
  const srcW = (rot === 90 || rot === 270) ? img.naturalHeight : img.naturalWidth;
  const srcH = (rot === 90 || rot === 270) ? img.naturalWidth : img.naturalHeight;
  const rotated = document.createElement('canvas');
  rotated.width = srcW;
  rotated.height = srcH;
  const rctx = rotated.getContext('2d')!;
  rctx.save();
  rctx.translate(srcW / 2, srcH / 2);
  rctx.rotate((rot * Math.PI) / 180);
  rctx.scale(a.flipH ? -1 : 1, a.flipV ? -1 : 1);
  const dw = (rot === 90 || rot === 270) ? srcH : srcW;
  const dh = (rot === 90 || rot === 270) ? srcW : srcH;
  rctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  rctx.restore();

  // 2) Compute output canvas dimensions from the crop, capping at MAX_OUTPUT_DIM.
  const cw = a.crop.w;
  const ch = a.crop.h;
  const scale = Math.min(1, MAX_OUTPUT_DIM / Math.max(cw, ch));
  const outW = Math.max(1, Math.round(cw * scale));
  const outH = Math.max(1, Math.round(ch * scale));

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d')!;
  // Apply the filter chain when drawing the cropped region.
  (octx as any).filter = a.cssFilter;
  octx.drawImage(rotated, a.crop.x, a.crop.y, cw, ch, 0, 0, outW, outH);
  (octx as any).filter = 'none';

  // 3) Beauty composites
  if (a.glow > 0) {
    octx.save();
    octx.globalCompositeOperation = 'lighter';
    octx.fillStyle = `rgba(255,240,210,${a.glow * 0.004})`;
    octx.fillRect(0, 0, outW, outH);
    octx.restore();
  }
  if (a.sharpen > 0) {
    applySharpen(octx, outW, outH, a.sharpen);
  }
  if (a.vignette > 0) {
    const grad = octx.createRadialGradient(outW / 2, outH / 2, Math.min(outW, outH) * 0.35, outW / 2, outH / 2, Math.max(outW, outH) * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${(a.vignette * 0.005).toFixed(3)})`);
    octx.fillStyle = grad;
    octx.fillRect(0, 0, outW, outH);
  }

  // 4) Export as JPEG.
  return new Promise<Blob>((resolve, reject) => {
    out.toBlob((b) => {
      if (!b) return reject(new Error('Canvas toBlob failed'));
      resolve(b);
    }, 'image/jpeg', 0.92);
  });
}

// Simple 3x3 sharpen convolution. Strength scales how much the
// surrounding pixels are subtracted from the center.
function applySharpen(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  if (strength <= 0) return;
  try {
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);
    const sd = src.data;
    const dd = dst.data;
    const s = (strength / 100) * 0.6; // tame it a bit
    const k = 1 + 4 * s;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = sd[idx + c];
          const up = sd[idx - w * 4 + c];
          const down = sd[idx + w * 4 + c];
          const left = sd[idx - 4 + c];
          const right = sd[idx + 4 + c];
          let v = center * k - (up + down + left + right) * s;
          if (v < 0) v = 0; if (v > 255) v = 255;
          dd[idx + c] = v;
        }
        dd[idx + 3] = sd[idx + 3];
      }
    }
    // edges copied straight across
    for (let i = 0; i < sd.length; i += 4) {
      if (dd[i + 3] === 0) {
        dd[i] = sd[i]; dd[i + 1] = sd[i + 1]; dd[i + 2] = sd[i + 2]; dd[i + 3] = sd[i + 3];
      }
    }
    ctx.putImageData(dst, 0, 0);
  } catch {
    // toBlob/getImageData can fail on cross-origin images that aren't
    // truly anonymous — skip rather than crash.
  }
}

// -- presentational helpers --

function tabIcon(k: TabKey) {
  switch (k) {
    case 'crop':    return '✂️';
    case 'adjust':  return '🎚️';
    case 'filters': return '🎨';
    case 'beauty':  return '✨';
  }
}
function tabLabel(k: TabKey) {
  switch (k) {
    case 'crop':    return 'Crop';
    case 'adjust':  return 'Adjust';
    case 'filters': return 'Filters';
    case 'beauty':  return 'Beauty';
  }
}
function tabBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    background: active ? 'rgba(200,149,108,0.18)' : 'transparent',
    border: 'none',
    color: active ? '#ffd5a8' : 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: 700,
    padding: '10px 6px',
    borderRadius: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
function cornerHandleStyle(m: string): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 16,
    height: 16,
    background: 'white',
    borderRadius: 4,
    boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
    pointerEvents: 'auto',
    cursor: m + '-resize' as any,
  };
  if (m === 'nw') return { ...base, top: -8, left: -8 };
  if (m === 'ne') return { ...base, top: -8, right: -8 };
  if (m === 'sw') return { ...base, bottom: -8, left: -8 };
  if (m === 'se') return { ...base, bottom: -8, right: -8 };
  if (m === 'n')  return { ...base, top: -8, left: '50%', transform: 'translateX(-50%)' };
  if (m === 's')  return { ...base, bottom: -8, left: '50%', transform: 'translateX(-50%)' };
  if (m === 'e')  return { ...base, right: -8, top: '50%', transform: 'translateY(-50%)' };
  return /* 'w' */ { ...base, left: -8, top: '50%', transform: 'translateY(-50%)' };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11, fontWeight: 800,
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: 8,
      }}>{label}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? 'linear-gradient(135deg, #c8956c, #ffb37c)' : 'rgba(255,255,255,0.08)',
        color: active ? '#1a1208' : 'white',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
        padding: '8px 14px',
        borderRadius: 100,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function Slider({
  label, value, setValue, min, max, reset,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  reset: number;
}) {
  const dirty = value !== reset;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{label}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: dirty ? '#ffd5a8' : 'rgba(255,255,255,0.55)', minWidth: 32, textAlign: 'right' }}>
            {value}
          </span>
          {dirty && (
            <button
              type="button"
              onClick={() => setValue(reset)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.65)',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 100,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Reset
            </button>
          )}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#c8956c' }}
      />
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: '8px 10px',
};
const primaryBtn: React.CSSProperties = {
  background: '#c8956c',
  border: 'none',
  color: 'white',
  fontSize: 14,
  fontWeight: 800,
  padding: '10px 18px',
  borderRadius: 100,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 6px 18px rgba(200,149,108,0.4)',
};
