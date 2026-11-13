'use client';
// Banner section for edit-profile: shows the current banner, lets the member
// pick one from the library, upload their own (with a fixed-ratio crop and
// no quality loss), or remove it. Changes are held in the parent's state and
// saved with the rest of the profile.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '../lib/toast';
import { safeUpload } from '../lib/safeUpload';
import { BANNER_LIBRARY } from '../lib/bannerLibrary';
import { BANNER_RATIO, BANNER_WIDTHS, bannerMask } from '../lib/banners';
import { ProfileBanner } from './ProfileBanner';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MIN_WIDTH = 800;
const GOOD_WIDTH = 1600;

export function BannerPicker({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Pick an image file.'); return; }
    if (f.size > MAX_FILE_BYTES) { toast.error('Pick an image under 25 MB.'); return; }
    setCropFile(f);
  }

  async function saveCropped(blobs: Record<number, Blob>) {
    setUploading(true);
    try {
      const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const base = `${userId}/${stamp}`;
      for (const w of BANNER_WIDTHS) {
        await safeUpload(blobs[w], {
          bucket: 'banners',
          path: `${base}-${w}.webp`,
          kind: 'image',
          filename: `${stamp}-${w}.webp`,
          cacheControl: '31536000',
        });
      }
      onChange(`up:${base}`);
      toast.success('Banner added. Save your profile to keep it.');
      setCropFile(null);
    } catch {
      toast.error("Couldn't upload that banner. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  const btn: React.CSSProperties = {
    padding: '10px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: '1px solid rgba(200,149,108,0.4)', background: 'white', color: 'var(--brand-personal-text-head)',
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--brand-personal-text-head)', marginBottom: 8 }}>
        Profile banner
      </label>
      <div style={{ border: '1px solid rgba(200,149,108,0.25)', borderRadius: 20, overflow: 'hidden', background: 'white' }}>
        {value ? (
          <ProfileBanner value={value} radius={20} height="clamp(120px, 30vw, 170px)" />
        ) : (
          <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a8878', fontSize: 13,
            background: 'linear-gradient(135deg, #e8d5c4 0%, var(--brand-personal) 100%)' }}>
            <span style={{ background: 'rgba(255,255,255,0.8)', padding: '4px 12px', borderRadius: 100 }}>No banner yet</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 12 }}>
          <button type="button" style={btn} onClick={() => setShowLibrary(true)}>Choose from library</button>
          <button type="button" style={btn} onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload your own'}
          </button>
          {value && <button type="button" style={{ ...btn, color: 'var(--brand-danger-text)' }} onClick={() => onChange(null)}>Remove</button>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
      <p style={{ fontSize: 12, color: '#9a8878', marginTop: 8 }}>
        Your profile color fades into the banner. Uploads stay full quality on every screen.
      </p>

      {showLibrary && (
        <LibraryModal
          current={value}
          onPick={(id) => { onChange(`lib:${id}`); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
        />
      )}
      {cropFile && (
        <CropModal file={cropFile} busy={uploading} onCancel={() => setCropFile(null)} onSave={saveCropped} />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#221d19', color: '#f3e6d8', border: '1px solid rgba(200,149,108,0.35)', borderRadius: 24, width: '100%', maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(200,149,108,0.25)' }}>
          <strong style={{ fontSize: 17, color: '#f3e6d8' }}>{title}</strong>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', fontSize: 26, cursor: 'pointer', color: '#f3e6d8' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 20 }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function LibraryModal({ current, onPick, onClose }: { current: string | null; onPick: (id: string) => void; onClose: () => void }) {
  const cats: string[] = [];
  for (const b of BANNER_LIBRARY) if (!cats.includes(b.category)) cats.push(b.category);
  const [cat, setCat] = useState<string>('All');
  const list = cat === 'All' ? BANNER_LIBRARY : BANNER_LIBRARY.filter((b) => b.category === cat);
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid rgba(200,149,108,0.4)', background: active ? '#c8956c' : '#2f2823', color: active ? '#1a1410' : '#f3e6d8',
  });
  return (
    <Modal title="Choose a banner" onClose={onClose}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {['All', ...cats].map((c) => (
          <button key={c} type="button" style={chip(c === cat)} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {list.map((b) => {
          const active = current === `lib:${b.id}`;
          return (
            <button key={b.id} type="button" onClick={() => onPick(b.id)}
              style={{ padding: 0, border: active ? '3px solid #c8956c' : '3px solid transparent', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', background: 'none', textAlign: 'left' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/banners/800/${b.id}.webp`} alt={b.name} loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '21 / 9', objectFit: 'cover' }} />
              <div style={{ fontSize: 12, fontWeight: 600, padding: '6px 8px', color: '#f3e6d8' }}>{b.name}</div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// Fixed 21:9 crop: drag to position, slider to zoom. Output is encoded from
// the ORIGINAL pixels (never upscaled) at up to 2400 / 1600 / 800 wide.
function CropModal({ file, busy, onCancel, onSave }: {
  file: File; busy: boolean; onCancel: () => void; onSave: (blobs: Record<number, Blob>) => void;
}) {
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 }); // image offset inside the frame, in frame px
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState(600);
  const frameH = frameW / BANNER_RATIO;

  useEffect(() => {
    let cancelled = false;
    createImageBitmap(file)
      .then((b) => {
        if (cancelled) return;
        if (b.width < MIN_WIDTH) {
          toast.error(`That image is too small (${b.width}px wide). Pick one at least ${MIN_WIDTH}px wide so it stays sharp.`);
          onCancel();
          return;
        }
        setBmp(b);
      })
      .catch(() => { toast.error("Couldn't read that image. Try a JPG, PNG or WebP."); onCancel(); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrameW(el.clientWidth || 600));
    ro.observe(el);
    return () => ro.disconnect();
  }, [bmp]);

  const cover = bmp ? Math.max(frameW / bmp.width, frameH / bmp.height) : 1;
  const scale = cover * zoom;
  const dispW = bmp ? bmp.width * scale : 0;
  const dispH = bmp ? bmp.height * scale : 0;
  const clampOff = (o: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(frameW - dispW, o.x)),
    y: Math.min(0, Math.max(frameH - dispH, o.y)),
  });
  // Keep centered on first load and whenever zoom/size changes.
  const pos = bmp ? clampOff(off.x === 0 && off.y === 0 ? { x: (frameW - dispW) / 2, y: (frameH - dispH) / 2 } : off) : { x: 0, y: 0 };

  function onDown(e: React.PointerEvent) {
    if (!bmp) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const sx = e.clientX, sy = e.clientY, start = { ...pos };
    function move(ev: PointerEvent) {
      setOff(clampOff({ x: start.x + ev.clientX - sx, y: start.y + ev.clientY - sy }));
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function changeZoom(z: number) {
    if (!bmp) return;
    // Zoom around the frame center.
    const cx = (frameW / 2 - pos.x) / scale;
    const cy = (frameH / 2 - pos.y) / scale;
    const ns = cover * z;
    const nx = frameW / 2 - cx * ns;
    const ny = frameH / 2 - cy * ns;
    setZoom(z);
    setOff({
      x: Math.min(0, Math.max(frameW - bmp.width * ns, nx)),
      y: Math.min(0, Math.max(frameH - bmp.height * ns, ny)),
    });
  }

  // Source rectangle (original pixels) currently inside the frame.
  const srcW = bmp ? frameW / scale : 0;
  const small = bmp ? srcW < GOOD_WIDTH : false;

  async function save() {
    if (!bmp) return;
    const sx = -pos.x / scale, sy = -pos.y / scale, sw = frameW / scale, sh = frameH / scale;
    const out: Record<number, Blob> = {};
    for (const w of BANNER_WIDTHS) {
      const cw = Math.max(1, Math.round(Math.min(w, sw))); // never upscale
      const ch = Math.max(1, Math.round(cw / BANNER_RATIO));
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const ctx = c.getContext('2d');
      if (!ctx) { toast.error('Your browser could not process the image.'); return; }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, cw, ch);
      const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/webp', 0.88));
      if (!blob) { toast.error('Your browser could not export the image.'); return; }
      out[w] = blob;
    }
    onSave(out);
  }

  return (
    <Modal title="Position your banner" onClose={onCancel}>
      <p style={{ fontSize: 13, color: '#d9c7b4', marginTop: 0 }}>
        Drag to position. Use the slider to zoom. This is how it will look, including the fade into your profile.
      </p>
      <div ref={frameRef} onPointerDown={onDown}
        style={{ position: 'relative', width: '100%', aspectRatio: `${BANNER_RATIO}`, overflow: 'hidden', borderRadius: 16, background: '#221d19', touchAction: 'none', cursor: 'grab' }}>
        {bmp && url && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', WebkitMaskImage: bannerMask(), maskImage: bannerMask() }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" draggable={false}
              style={{ position: 'absolute', left: pos.x, top: pos.y, width: dispW, height: dispH, maxWidth: 'none', userSelect: 'none', pointerEvents: 'none' }} />
          </div>
        )}
      </div>
      <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => changeZoom(parseFloat(e.target.value))}
        aria-label="Zoom" style={{ width: '100%', marginTop: 16 }} />
      {small && (
        <p style={{ fontSize: 12, color: '#f0c48a', background: '#3a2c1c', padding: '8px 12px', borderRadius: 10 }}>
          This crop is on the small side and may look slightly soft on large screens. A wider photo (at least {GOOD_WIDTH}px) looks best.
        </p>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
        <button type="button" onClick={onCancel} disabled={busy}
          style={{ padding: '10px 18px', borderRadius: 100, border: '1px solid rgba(200,149,108,0.5)', background: '#2f2823', color: '#f3e6d8', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
        <button type="button" onClick={save} disabled={busy || !bmp}
          style={{ padding: '10px 22px', borderRadius: 100, border: 'none', background: '#c8956c', color: '#1a1410', fontWeight: 700, cursor: 'pointer', opacity: busy || !bmp ? 0.6 : 1 }}>
          {busy ? 'Uploading…' : 'Use this banner'}
        </button>
      </div>
    </Modal>
  );
}
