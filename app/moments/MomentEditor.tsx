'use client';
// Photo editor for MI Moments: frame the photo in a 9:16 story frame
// (drag to move, pinch or slider to zoom), pick a filter, tune brightness
// and contrast, then post.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Adjust, Crop, PRESETS, NEUTRAL, cssFilter, exportMoment,
} from './momentsImage';

const FW = 216;
const FH = 384;

interface Props {
  img: HTMLImageElement;
  src: string;
  onCancel: () => void;
  onPost: (blob: Blob) => Promise<void>;
}

export function MomentEditor({ img, src, onCancel, onPost }: Props) {
  const [zoom, setZoom] = useState(1);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [presetId, setPresetId] = useState('original');
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ ox: 0, oy: 0, zoom: 1, dist: 0, x: 0, y: 0 });

  const base = Math.max(FW / img.naturalWidth, FH / img.naturalHeight);

  function limits(z: number) {
    const w = img.naturalWidth * base * z;
    const h = img.naturalHeight * base * z;
    return { mx: Math.max(0, (w - FW) / 2), my: Math.max(0, (h - FH) / 2) };
  }
  function clampOffsets(nx: number, ny: number, z: number) {
    const { mx, my } = limits(z);
    return { x: Math.min(mx, Math.max(-mx, nx)), y: Math.min(my, Math.max(-my, ny)) };
  }
  function applyZoom(z: number) {
    const nz = Math.min(4, Math.max(1, z));
    const c = clampOffsets(ox, oy, nz);
    setZoom(nz); setOx(c.x); setOy(c.y);
  }

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const adjust: Adjust = useMemo(
    () => ({ ...preset.adjust, brightness: preset.adjust.brightness * brightness, contrast: preset.adjust.contrast * contrast }),
    [preset, brightness, contrast],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  function onDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { ox, oy, zoom, dist: 0, x: e.clientX, y: e.clientY };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.dist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function onMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && gesture.current.dist > 0) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const nz = Math.min(4, Math.max(1, gesture.current.zoom * (d / gesture.current.dist)));
      const c = clampOffsets(gesture.current.ox, gesture.current.oy, nz);
      setZoom(nz); setOx(c.x); setOy(c.y);
    } else if (pointers.current.size === 1) {
      const c = clampOffsets(
        gesture.current.ox + (e.clientX - gesture.current.x),
        gesture.current.oy + (e.clientY - gesture.current.y),
        zoom,
      );
      setOx(c.x); setOy(c.y);
    }
  }
  function onUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    gesture.current = { ox, oy, zoom, dist: 0, x: e.clientX, y: e.clientY };
  }

  async function post() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const crop: Crop = { zoom, ox, oy };
      const blob = await exportMoment(img, crop, adjust, FW, FH);
      await onPost(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post your photo. Try again.');
      setBusy(false);
    }
  }

  const dispW = img.naturalWidth * base * zoom;
  const dispH = img.naturalHeight * base * zoom;

  const chip = (active: boolean): React.CSSProperties => ({
    flex: '0 0 auto',
    padding: '7px 14px',
    borderRadius: 100,
    border: active ? '1.5px solid var(--brand-personal)' : '1px solid rgba(200,149,108,0.3)',
    background: active ? 'rgba(200,149,108,0.18)' : 'white',
    color: 'var(--brand-personal-text-head)',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
  });
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--brand-personal-text-mid)', width: 74 };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit your photo"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto',
        background: 'var(--brand-personal-bg-cream)',
        display: 'flex', justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, padding: '16px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={{ background: 'none', border: 'none', fontSize: 15, fontWeight: 700, color: 'var(--brand-personal-text-mid)', cursor: 'pointer', fontFamily: 'inherit', padding: '8px 4px' }}>
            Cancel
          </button>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--brand-personal-text-head)' }}>Edit photo</p>
          <button
            type="button"
            onClick={post}
            disabled={busy}
            style={{ background: 'var(--brand-personal)', color: 'white', border: 'none', borderRadius: 100, padding: '9px 20px', fontSize: 14, fontWeight: 800, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'Posting...' : 'Post'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onWheel={(e) => applyZoom(zoom - e.deltaY * 0.002)}
            style={{
              width: FW, height: FH, borderRadius: 16, overflow: 'hidden', position: 'relative',
              background: '#000', touchAction: 'none', cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none',
              boxShadow: '0 10px 30px rgba(90,60,30,0.25)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                width: dispW, height: dispH,
                left: FW / 2 + ox - dispW / 2,
                top: FH / 2 + oy - dispH / 2,
                maxWidth: 'none',
                filter: cssFilter(adjust),
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
        <p style={{ margin: '0 0 14px', textAlign: 'center', fontSize: 12.5, color: 'var(--brand-personal-text-light)' }}>
          Drag to move. Pinch or use the slider to zoom.
        </p>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPresetId(p.id)} style={chip(p.id === presetId)}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={label}>Zoom</span>
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => applyZoom(Number(e.target.value))} style={{ flex: 1 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={label}>Brightness</span>
            <input type="range" min={0.6} max={1.4} step={0.01} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={{ flex: 1 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={label}>Contrast</span>
            <input type="range" min={0.6} max={1.4} step={0.01} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} style={{ flex: 1 }} />
          </label>
        </div>

        <button
          type="button"
          onClick={() => { setPresetId('original'); setBrightness(NEUTRAL.brightness); setContrast(NEUTRAL.contrast); setZoom(1); setOx(0); setOy(0); }}
          style={{ marginTop: 14, background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--brand-personal-text-light)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Reset edits
        </button>
        {error && <p role="alert" style={{ marginTop: 12, fontSize: 13.5, color: '#b42318' }}>{error}</p>}
      </div>
    </div>
  );
}
