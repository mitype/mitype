'use client';
// /wave/create — Wave video editor + uploader.
//
// Flow:
//   1. Pick a video from the device
//   2. Edit on a single screen — trim, color filter, caption text
//      All edits preview live. A Mitype watermark is always applied.
//   3. On Post: re-render the video through a canvas, capturing audio
//      via captureStream, encoding via MediaRecorder, then upload the
//      processed blob to Supabase storage.
//   4. Call /api/wave/finalize to create the wave_videos row.
//
// All processing happens client-side. No external services, no FFmpeg
// install on Vercel — just standard browser APIs.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { toast } from '../../lib/toast';
import { WaveEditorTutorial } from '../../components/WaveEditorTutorial';
import { ALL_CATEGORIES } from '../../lib/categories';

const MAX_DURATION = 60;
const MAX_SIZE_MB = 500;
const MAX_CAPTION = 80;

interface FilterOption {
  key: string;
  label: string;
  cssFilter: string; // applied to <video> AND canvas ctx.filter
}

const FILTERS: FilterOption[] = [
  { key: 'none',   label: 'Original',     cssFilter: 'none' },
  { key: 'warm',   label: 'Warm Cinema',  cssFilter: 'sepia(0.18) saturate(1.25) contrast(1.08) brightness(1.02)' },
  { key: 'moody',  label: 'Moody',        cssFilter: 'contrast(1.18) saturate(0.88) brightness(0.94)' },
  { key: 'bw',     label: 'Black & White', cssFilter: 'grayscale(1) contrast(1.12)' },
  { key: 'sepia',  label: 'Sepia',        cssFilter: 'sepia(0.85) contrast(1.05) saturate(1.1)' },
  { key: 'cool',   label: 'Cool Tone',    cssFilter: 'saturate(1.12) brightness(1.04) contrast(1.05)' },
  { key: 'faded',  label: 'Faded Film',   cssFilter: 'saturate(0.78) contrast(0.92) brightness(1.06) sepia(0.08)' },
];

type Step = 'pick' | 'edit' | 'processing' | 'uploading';

export default function WaveCreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [user, setUser] = useState<any>(null);
  const [myCategories, setMyCategories] = useState<string[]>([]);
  const [step, setStep] = useState<Step>('pick');

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Full duration of the source video (could be 5+ minutes from library).
  const [sourceDuration, setSourceDuration] = useState(0);
  // Currently selected start/end within the source. Range cannot exceed MAX_DURATION.
  const [duration, setDuration] = useState(0); // kept for backward compatibility — equals trimEnd - trimStart
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 1080, h: 1920 });

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [filterIdx, setFilterIdx] = useState(0);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

  const filter = FILTERS[filterIdx];

  // Auth + load my categories
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('categories, wave_editor_tutorial_seen')
        .eq('user_id', user.id)
        .maybeSingle();
      setMyCategories(profile?.categories ?? []);
      if (profile?.categories?.length) setCategory(profile.categories[0]);
      if (!profile?.wave_editor_tutorial_seen) setShowTutorial(true);

      // Hand-off support: if another page navigated here with a
      // ?prefill_caption=... query param (e.g. Story Builder → Send
      // to Wave), pre-fill the caption input. The caption is clamped
      // to MAX_CAPTION at save time, so longer prefills just get the
      // visible portion as a starting point.
      if (typeof window !== 'undefined') {
        try {
          const params = new URLSearchParams(window.location.search);
          const prefill = params.get('prefill_caption');
          if (prefill) {
            setCaption(prefill.slice(0, MAX_CAPTION));
          }
        } catch {
          /* ignore */
        }
      }
    })();
  }, [router]);

  async function handleTutorialDone() {
    setShowTutorial(false);
    if (user) {
      await supabase
        .from('profiles')
        .update({ wave_editor_tutorial_seen: true })
        .eq('user_id', user.id);
    }
  }

  // Live preview: when the user is editing, scrub the video to trimStart
  // whenever they change the trim window so the preview stays in range.
  useEffect(() => {
    if (step !== 'edit' || !videoRef.current) return;
    const v = videoRef.current;
    const onTimeUpdate = () => {
      if (v.currentTime >= trimEnd) {
        v.currentTime = trimStart;
        v.play().catch(() => {});
      }
      if (v.currentTime < trimStart) {
        v.currentTime = trimStart;
      }
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    return () => v.removeEventListener('timeupdate', onTimeUpdate);
  }, [step, trimStart, trimEnd]);

  function pickFile() {
    fileInputRef.current?.click();
  }

  function pickFromLibrary() {
    libraryInputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      toast.error('Please pick a video file');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_SIZE_MB}MB`);
      return;
    }
    const url = URL.createObjectURL(f);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = url;
    const ready = await new Promise<boolean>((resolve) => {
      probe.onloadedmetadata = () => resolve(true);
      probe.onerror = () => resolve(false);
    });
    if (!ready) {
      toast.error("Couldn't read that video");
      URL.revokeObjectURL(url);
      return;
    }
    const sourceDur = probe.duration || 0;
    const defaultEnd = Math.min(MAX_DURATION, sourceDur);
    setFile(f);
    setPreviewUrl(url);
    setSourceDuration(sourceDur);
    setDuration(defaultEnd);
    setTrimStart(0);
    setTrimEnd(defaultEnd);
    setDims({ w: probe.videoWidth || 1080, h: probe.videoHeight || 1920 });
    setStep('edit');
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setFilterIdx(0);
    setCaption('');
    setStep('pick');
  }

  // Draws the watermark + caption onto a canvas frame.
  function drawOverlays(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    captionText: string
  ) {
    // Watermark (top-right) — inset enough that even when a landscape
    // video is portrait-cropped in the feed (objectFit: cover, which
    // can shave 30-40% off the sides), the watermark stays inside the
    // visible area. We use a percentage of the SHORTER dimension so
    // the inset works for both portrait and landscape inputs.
    const wmFontSize = Math.max(18, Math.round(w * 0.025));
    ctx.font = `900 ${wmFontSize}px Helvetica, Arial, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    const padding = Math.round(w * 0.025);
    const shortSide = Math.min(w, h);
    // Pull the watermark in by ~20% of the short side so a landscape
    // video cropped to a 9:16 viewport still shows it on-screen.
    const safeRightInset = Math.round(shortSide * 0.2) + padding;
    const safeTopInset = Math.round(shortSide * 0.04) + padding;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText('mitype', w - safeRightInset + 1, safeTopInset + 1);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('mitype', w - safeRightInset, safeTopInset);

    // Caption (bottom-center, pill background)
    if (captionText) {
      const captionFont = Math.max(20, Math.round(w * 0.038));
      ctx.font = `700 ${captionFont}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const metrics = ctx.measureText(captionText);
      const padX = Math.round(captionFont * 0.7);
      const padY = Math.round(captionFont * 0.5);
      const boxW = Math.min(w - padding * 2, metrics.width + padX * 2);
      const boxH = captionFont + padY * 2;
      const boxX = w / 2 - boxW / 2;
      const boxY = h - padding * 3 - boxH;
      // Pill background
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const r = boxH / 2;
      ctx.beginPath();
      ctx.moveTo(boxX + r, boxY);
      ctx.lineTo(boxX + boxW - r, boxY);
      ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + r, r);
      ctx.lineTo(boxX + boxW, boxY + boxH - r);
      ctx.arcTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH, r);
      ctx.lineTo(boxX + r, boxY + boxH);
      ctx.arcTo(boxX, boxY + boxH, boxX, boxY + boxH - r, r);
      ctx.lineTo(boxX, boxY + r);
      ctx.arcTo(boxX, boxY, boxX + r, boxY, r);
      ctx.closePath();
      ctx.fill();
      // Caption text
      ctx.fillStyle = 'white';
      ctx.fillText(captionText, w / 2, boxY + boxH / 2);
    }
  }

  // Pick the best supported MediaRecorder mimeType.
  function pickMimeType(): string {
    const candidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const m of candidates) {
      if (typeof MediaRecorder !== 'undefined' && (MediaRecorder as any).isTypeSupported?.(m)) {
        return m;
      }
    }
    return 'video/webm';
  }

  // Process the video through canvas + MediaRecorder. Bakes the trim,
  // filter, caption, and watermark into the output blob.
  async function processVideo(): Promise<{ blob: Blob; ext: string }> {
    if (!previewUrl) throw new Error('No video');

    // Use an off-screen video element so we don't interfere with the
    // preview that's still playing in the UI.
    const v = document.createElement('video');
    v.src = previewUrl;
    v.muted = false;
    v.playsInline = true;
    v.preload = 'auto';
    (v as any).crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      v.onloadedmetadata = () => resolve();
      v.onerror = () => reject(new Error('Could not load source video for processing'));
    });

    // Cap output dimensions for sane file size.
    const srcW = v.videoWidth || dims.w;
    const srcH = v.videoHeight || dims.h;
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const outW = Math.round(srcW * scale);
    const outH = Math.round(srcH * scale);

    const canvas = canvasRef.current ?? document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');

    const stream = (canvas as any).captureStream(30) as MediaStream;

    // Add audio from the video element if available. We use the
    // Web Audio API (createMediaElementSource + MediaStreamDestination)
    // because iOS Safari does NOT implement HTMLVideoElement.captureStream,
    // which was the older approach. Web Audio works everywhere modern,
    // including iOS Safari.
    let audioCtx: AudioContext | null = null;
    try {
      const AudioCtxCtor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxCtor) {
        audioCtx = new AudioCtxCtor();
        if (audioCtx!.state === 'suspended') {
          await audioCtx!.resume();
        }
        const sourceNode = audioCtx!.createMediaElementSource(v);
        const destNode = audioCtx!.createMediaStreamDestination();
        sourceNode.connect(destNode);
        // Note: we deliberately do NOT connect to audioCtx.destination,
        // because we don't want the processing video to play audibly
        // through the user's speakers while we're rendering.
        for (const track of destNode.stream.getAudioTracks()) {
          stream.addTrack(track);
        }
      }
    } catch (audioErr) {
      console.warn('[wave/create] audio capture via Web Audio failed:', audioErr);
      // Last-ditch fallback for browsers that DO have captureStream.
      try {
        const vAny = v as any;
        const vStream: MediaStream | null = vAny.captureStream
          ? vAny.captureStream()
          : vAny.mozCaptureStream
            ? vAny.mozCaptureStream()
            : null;
        if (vStream) {
          for (const track of vStream.getAudioTracks()) {
            stream.addTrack(track);
          }
        }
      } catch {
        // Silent video; better than failing the whole upload.
      }
    }

    const mimeType = pickMimeType();
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 3_500_000,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    // Seek to start and play.
    v.currentTime = trimStart;
    await new Promise<void>((resolve) => {
      v.onseeked = () => resolve();
    });

    recorder.start(250);
    await v.play();

    // Render loop: draw each video frame onto the canvas with filter +
    // overlays applied, until we hit the trim end.
    let stop = false;
    const cssFilter = filter.cssFilter;

    function frame() {
      if (stop) return;
      try {
        ctx!.save();
        // Reset any transform / clear
        ctx!.setTransform(1, 0, 0, 1, 0, 0);
        ctx!.filter = cssFilter;
        ctx!.drawImage(v, 0, 0, outW, outH);
        ctx!.filter = 'none';
        drawOverlays(ctx!, outW, outH, caption.trim());
        ctx!.restore();
      } catch {
        // Drawing errors are non-fatal; keep going.
      }

      // Progress update
      const elapsed = v.currentTime - trimStart;
      const total = trimEnd - trimStart;
      if (total > 0) {
        setProgress(Math.min(99, Math.round((elapsed / total) * 100)));
      }

      if (v.currentTime >= trimEnd || v.ended) {
        stop = true;
        v.pause();
        recorder.stop();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    await stopped;

    // Release the AudioContext now that recording has finished.
    if (audioCtx) {
      try {
        await audioCtx.close();
      } catch {
        // Non-fatal.
      }
    }

    const blob = new Blob(chunks, { type: mimeType });
    return { blob, ext };
  }

  async function handlePost() {
    if (!file || !user) return;
    if (trimEnd <= trimStart || trimEnd - trimStart < 0.5) {
      toast.error('Pick a trim range of at least half a second');
      return;
    }

    setStep('processing');
    setProgress(0);
    setProgressLabel('Editing video…');

    let processed: { blob: Blob; ext: string };
    try {
      processed = await processVideo();
    } catch (err: any) {
      console.error('[wave/create] process error:', err);
      toast.error(err.message ?? 'Could not process video');
      setStep('edit');
      return;
    }

    setStep('uploading');
    setProgressLabel('Uploading…');
    setProgress(0);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const urlRes = await fetch('/api/wave/upload-url', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlJson.error ?? 'Could not start upload');

      // Direct PUT to Supabase storage with progress.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', urlJson.uploadUrl);
        xhr.setRequestHeader('Content-Type', processed.blob.type || 'video/mp4');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Upload error'));
        xhr.send(processed.blob);
      });

      const finalRes = await fetch('/api/wave/finalize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath: urlJson.path,
          caption: caption.trim() || null,
          category: category || null,
          durationSeconds: Math.round(trimEnd - trimStart),
          width: dims.w,
          height: dims.h,
        }),
      });
      const finalJson = await finalRes.json();
      if (!finalRes.ok) throw new Error(finalJson.error ?? 'Could not save video');

      toast.success('Posted to The Wave!');
      router.push('/wave');
    } catch (err: any) {
      console.error('[wave/create] post error:', err);
      toast.error(err.message ?? 'Could not post video');
      setStep('edit');
    }
  }

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------

  if (step === 'pick') {
    return (
      <main style={pageStyle}>
        <Nav />
        <div style={{ ...cardStyle, position: 'relative' }}>
          <button type="button" onClick={pickFile} style={pickButtonStyle}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>📹</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              Pick a video to edit
            </div>
            <div style={{ fontSize: 13, color: '#8a7560' }}>
              Record a new one or choose from your library. Long videos can be trimmed to 60s.
            </div>
          </button>

          {/* Small library shortcut — bottom-left as a separate affordance for users
              who want to jump straight to their existing videos. */}
          <button
            type="button"
            onClick={pickFromLibrary}
            aria-label="Choose from your video library"
            style={{
              position: 'absolute',
              left: 22,
              bottom: 22,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'white',
              border: '1px solid rgba(200,149,108,0.4)',
              borderRadius: 100,
              color: '#6b5744',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(200,149,108,0.18)',
            }}
          >
            <span style={{ fontSize: 16 }}>🖼️</span>
            From your library
          </button>

          {/* Default picker — no capture attribute so the system shows both
              "Photo Library" and "Take Video" options on iOS/Android. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          {/* Library-only picker — forces the gallery view. */}
          <input
            ref={libraryInputRef}
            type="file"
            accept="video/*"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
        </div>
        {showTutorial && <WaveEditorTutorial onDismiss={handleTutorialDone} />}
      </main>
    );
  }

  if (step === 'processing' || step === 'uploading') {
    return (
      <main style={pageStyle}>
        <Nav />
        <div style={{ ...cardStyle, textAlign: 'center', padding: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1208', marginBottom: 8 }}>
            {progressLabel}
          </div>
          <div style={{ color: '#8a7560', fontSize: 14, marginBottom: 24 }}>
            {step === 'processing'
              ? 'Baking your filter, caption, and Mitype watermark into the video.'
              : 'Uploading to The Wave.'}
          </div>
          <div style={{
            height: 8,
            background: 'rgba(200,149,108,0.18)',
            borderRadius: 100,
            overflow: 'hidden',
            marginBottom: 12,
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: '#c8956c',
              borderRadius: 100,
              transition: 'width 0.2s ease',
            }} />
          </div>
          <div style={{ color: '#8a7560', fontSize: 13 }}>{progress}%</div>
        </div>
      </main>
    );
  }

  // step === 'edit'
  return (
    <main style={pageStyle}>
      <Nav />

      {/* Preview with filter applied live via CSS */}
      <div style={{
        ...cardStyle,
        padding: 0,
        overflow: 'hidden',
        background: '#000',
        position: 'relative',
        aspectRatio: `${dims.w} / ${dims.h}`,
        maxHeight: 460,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {previewUrl && (
          <video
            ref={videoRef}
            src={previewUrl}
            autoPlay
            loop
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: filter.cssFilter,
              background: '#000',
            }}
          />
        )}

        {/* Live caption preview */}
        {caption.trim() && (
          <div style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.55)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 700,
            maxWidth: '85%',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {caption}
          </div>
        )}

        {/* Live watermark preview */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 14,
          color: 'rgba(255,255,255,0.85)',
          fontSize: 14,
          fontWeight: 900,
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          letterSpacing: '-0.3px',
        }}>
          mitype
        </div>
      </div>

      {/* Trim */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={sectionLabel}>Trim</div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#c8956c',
            background: 'rgba(200,149,108,0.12)',
            padding: '4px 10px',
            borderRadius: 100,
            letterSpacing: '0.5px',
          }}>
            MAX 60s
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8a7560', fontSize: 13, marginBottom: 8 }}>
          <span>{trimStart.toFixed(1)}s</span>
          <span style={{ flex: 1, textAlign: 'center', color: '#1a1208', fontWeight: 700 }}>
            {(trimEnd - trimStart).toFixed(1)}s selected
          </span>
          <span>{trimEnd.toFixed(1)}s</span>
        </div>
        <div style={{ position: 'relative', height: 36 }}>
          <input
            type="range"
            min={0}
            max={sourceDuration}
            step={0.1}
            value={trimStart}
            onChange={(e) => {
              const v = Math.min(parseFloat(e.target.value), Math.max(0, trimEnd - 0.5));
              setTrimStart(v);
              // If the user pushes start too close to end, slide the end forward to keep 60s window when possible.
              if (trimEnd - v > MAX_DURATION) {
                setTrimEnd(Math.min(v + MAX_DURATION, sourceDuration));
              }
              if (videoRef.current) videoRef.current.currentTime = v;
            }}
            style={trimRangeStyle}
          />
          <input
            type="range"
            min={0}
            max={sourceDuration}
            step={0.1}
            value={trimEnd}
            onChange={(e) => {
              let v = Math.max(parseFloat(e.target.value), trimStart + 0.5);
              if (v - trimStart > MAX_DURATION) {
                v = trimStart + MAX_DURATION;
              }
              setTrimEnd(Math.min(v, sourceDuration));
            }}
            style={trimRangeStyle}
          />
        </div>
        {sourceDuration > MAX_DURATION && (
          <div style={{ fontSize: 12, color: '#8a7560', marginTop: 10, lineHeight: 1.5 }}>
            Your source video is {Math.floor(sourceDuration / 60)}m {Math.round(sourceDuration % 60)}s. Slide the handles to pick the 60-second window you want to post.
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Filter</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {FILTERS.map((f, i) => {
            const selected = i === filterIdx;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterIdx(i)}
                style={{
                  background: selected ? '#c8956c' : 'white',
                  border: `1px solid ${selected ? '#c8956c' : 'rgba(200,149,108,0.3)'}`,
                  color: selected ? 'white' : '#6b5744',
                  padding: '10px 14px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Caption */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Caption text (optional)</div>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
          placeholder="Add a short caption that appears on the video"
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1px solid rgba(200,149,108,0.25)',
            borderRadius: 12,
            fontSize: 15,
            fontFamily: 'inherit',
            color: '#1a1208',
            background: '#faf6f0',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: '#a89278', marginTop: 4 }}>
          {caption.length}/{MAX_CAPTION}
        </div>
      </div>

      {/* Category tag — pick from the FULL platform category list so the
          video can be tagged with whatever fits, regardless of what the
          poster has set on their own profile. The poster's own categories
          are surfaced as quick suggestions at the top. */}
      <CategoryPicker
        value={category}
        onChange={setCategory}
        myCategories={myCategories}
      />


      {/* Post + discard */}
      <button type="button" onClick={handlePost} style={postButtonStyle}>
        Post to The Wave
      </button>
      <button type="button" onClick={discard} style={discardButtonStyle}>
        Pick a different video
      </button>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {showTutorial && <WaveEditorTutorial onDismiss={handleTutorialDone} />}
    </main>
  );
}

function Nav() {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    }}>
      <Link href="/wave" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 22, fontWeight: 700 }} aria-label="Back to The Wave">
        ←
      </Link>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1208' }}>Post to The Wave</div>
      <div style={{ width: 24 }} />
    </nav>
  );
}

// Category picker for posting a Wave video. Lets the poster pick from
// the FULL platform category list (not just their own profile categories)
// so the video can be tagged to whatever fits best. Their own categories
// are surfaced as one-tap suggestions at the top, and a search box filters
// the full list for fast access.
function CategoryPicker({
  value,
  onChange,
  myCategories,
}: {
  value: string;
  onChange: (v: string) => void;
  myCategories: string[];
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q
    ? ALL_CATEGORIES.filter((c) => c.toLowerCase().includes(q))
    : ALL_CATEGORIES;

  return (
    <div style={cardStyle}>
      <div style={sectionLabel}>Tag a category</div>
      <p style={{ fontSize: 13, color: '#8a7560', margin: '0 0 12px', lineHeight: 1.4 }}>
        Pick any category that fits your video — it doesn&rsquo;t have to be one of yours.
        Your video will show up when other creatives filter by this category.
      </p>

      {/* Quick suggestions: the poster's own profile categories. */}
      {myCategories.length > 0 && (
        <>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#a89278',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 8,
          }}>
            Your categories
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {myCategories.map((cat) => {
              const selected = cat === value;
              return (
                <button
                  key={`mine-${cat}`}
                  type="button"
                  onClick={() => onChange(cat)}
                  style={{
                    background: selected ? '#c8956c' : 'white',
                    border: `1px solid ${selected ? '#c8956c' : 'rgba(200,149,108,0.3)'}`,
                    color: selected ? 'white' : '#6b5744',
                    padding: '8px 14px',
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Currently selected — shown prominently when it's NOT in
          "your categories" so the user always sees what they picked. */}
      {value && !myCategories.includes(value) && (
        <div style={{
          marginBottom: 14,
          padding: '10px 14px',
          background: 'rgba(200,149,108,0.1)',
          border: '1px solid rgba(200,149,108,0.3)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7560', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Selected
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#6b5744', marginTop: 2 }}>
              {value}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8a7560',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Clear
          </button>
        </div>
      )}

      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#a89278',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: 8,
      }}>
        Browse all
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search categories…"
        style={{
          width: '100%',
          padding: '10px 14px',
          background: '#faf6f0',
          border: '1px solid rgba(200,149,108,0.25)',
          borderRadius: 12,
          fontSize: 14,
          color: '#1a1208',
          outline: 'none',
          marginBottom: 10,
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        maxHeight: 220,
        overflowY: 'auto',
        padding: 4,
        background: '#fbf7f1',
        border: '1px solid rgba(200,149,108,0.15)',
        borderRadius: 12,
      }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: '#a89278', margin: '12px auto' }}>
            No categories match &ldquo;{query}&rdquo;
          </p>
        ) : (
          filtered.map((cat) => {
            const selected = cat === value;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onChange(cat)}
                style={{
                  background: selected ? '#c8956c' : 'white',
                  border: `1px solid ${selected ? '#c8956c' : 'rgba(200,149,108,0.2)'}`,
                  color: selected ? 'white' : '#6b5744',
                  padding: '6px 12px',
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {cat}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  padding: '24px 20px 80px',
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 20,
  padding: 16,
  border: '1px solid rgba(200,149,108,0.2)',
  marginBottom: 14,
  boxShadow: '0 4px 14px rgba(200,149,108,0.06)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#6b5744',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  marginBottom: 12,
};

const pickButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '60px 20px',
  background: 'rgba(200,149,108,0.08)',
  border: '2px dashed rgba(200,149,108,0.35)',
  borderRadius: 16,
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#6b5744',
};

const trimRangeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  width: '100%',
  height: 36,
  background: 'transparent',
  pointerEvents: 'auto',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const postButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '17px',
  background: '#c8956c',
  color: 'white',
  border: 'none',
  borderRadius: 100,
  fontSize: 17,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
  fontFamily: 'inherit',
  marginTop: 6,
};

const discardButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  background: 'transparent',
  color: '#8a7560',
  border: 'none',
  borderRadius: 100,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginTop: 8,
};
