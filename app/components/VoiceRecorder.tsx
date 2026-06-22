'use client';
// Voice-note recorder. Renders a small mic button that opens a
// recording overlay when tapped: the user taps Start → a live
// waveform pulses while recording → taps Stop → a Send / Discard
// confirmation. On Send we return a Blob (+ duration) to the parent.
//
// Format selection: we prefer audio/webm;codecs=opus on browsers that
// support it (small, high quality), and fall back to audio/mp4
// (AAC) on iOS Safari which doesn't support WebM. The choice is made
// at runtime via MediaRecorder.isTypeSupported.

import { useEffect, useRef, useState } from 'react';

interface Props {
  onSend: (blob: Blob, durationSeconds: number) => void | Promise<void>;
  /** Hard cap on recording length (default 10 minutes). */
  maxSeconds?: number;
}

type Phase = 'idle' | 'open' | 'recording' | 'preview' | 'sending' | 'denied';

const MAX_BARS = 32;

export function VoiceRecorder({ onSend, maxSeconds = 600 }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const mimeRef = useRef<string>('audio/webm');
  const finalDurationRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      // Belt-and-suspenders cleanup on unmount.
      cleanupRecording();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickMime(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/ogg;codecs=opus',
    ];
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    for (const m of candidates) {
      try {
        if ((MediaRecorder as any).isTypeSupported?.(m)) return m;
      } catch { /* ignore */ }
    }
    return '';
  }

  function cleanupRecording() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    try { recorderRef.current?.stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    streamRef.current = null;
    recorderRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
  }

  async function startRecording() {
    setElapsed(0);
    setPeaks([]);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase('denied');
      return;
    }
    streamRef.current = stream;

    // Live waveform via AudioContext
    try {
      const AudioCtxCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtxCtor();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        analyser.getByteTimeDomainData(buf);
        // Compute RMS for one bar
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setPeaks((prev) => {
          const next = [...prev, Math.min(1, rms * 3)];
          return next.length > MAX_BARS ? next.slice(next.length - MAX_BARS) : next;
        });
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      /* waveform is non-essential; ignore */
    }

    const mimeType = pickMime();
    mimeRef.current = mimeType || 'audio/webm';
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const finalMime = mimeRef.current || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: finalMime });
      blobRef.current = blob;
      finalDurationRef.current = Math.max(1, Math.round((Date.now() - startTsRef.current) / 1000));
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPhase('preview');
      cleanupRecording();
    };

    startTsRef.current = Date.now();
    recorder.start(200);
    setPhase('recording');

    // Elapsed seconds tick
    tickRef.current = setInterval(() => {
      const e = Math.round((Date.now() - startTsRef.current) / 1000);
      setElapsed(e);
      if (e >= maxSeconds) stopRecording();
    }, 200);
  }

  function stopRecording() {
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setPeaks([]);
    setPhase('idle');
  }

  async function send() {
    if (!blobRef.current) return;
    setPhase('sending');
    try {
      await onSend(blobRef.current, finalDurationRef.current);
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      blobRef.current = null;
      setElapsed(0);
      setPeaks([]);
      setPhase('idle');
    }
  }

  function openOverlay() { setPhase('open'); }
  function closeOverlay() {
    discard();
  }

  return (
    <>
      <button
        type="button"
        onClick={openOverlay}
        aria-label="Record a voice note"
        title="Record a voice note"
        style={micButton}
      >
        {/* Sound-bar icon — cleaner than the mic emoji and renders
            identically on every device. Five vertical bars of varying
            heights look like a live waveform. */}
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2"  y="10" width="3" height="4"  rx="1.5" fill="currentColor" />
          <rect x="7"  y="7"  width="3" height="10" rx="1.5" fill="currentColor" />
          <rect x="12" y="3"  width="3" height="18" rx="1.5" fill="currentColor" />
          <rect x="17" y="8"  width="3" height="8"  rx="1.5" fill="currentColor" />
          <rect x="21" y="11" width="2.5" height="2"  rx="1.25" fill="currentColor" />
        </svg>
      </button>

      {phase !== 'idle' && (
        <div
          role="dialog"
          aria-modal="true"
          data-no-swipe-back="true"
          style={overlay}
        >
          <div style={panel}>
            {phase === 'denied' ? (
              <DeniedPanel onClose={closeOverlay} />
            ) : (
              <>
                <h3 style={panelTitle}>
                  {phase === 'preview' ? 'Send voice note?' : 'Voice note'}
                </h3>

                {/* Waveform */}
                <div style={waveformRow}>
                  {(phase === 'recording' ? peaks : staticPeaks(elapsed)).map((p, i) => (
                    <span
                      key={i}
                      style={{
                        width: 4,
                        height: Math.max(6, p * 60),
                        background: phase === 'recording' ? '#ff5a5a' : '#c8956c',
                        borderRadius: 100,
                        opacity: 0.9,
                        transition: 'height 0.06s linear',
                      }}
                    />
                  ))}
                </div>

                <div style={elapsedLabel}>
                  {fmtTime(elapsed)}{phase === 'recording' && <span style={{ marginLeft: 6, color: '#ff5a5a' }}>● REC</span>}
                </div>

                <div style={btnRow}>
                  {phase === 'open' && (
                    <>
                      <button type="button" onClick={closeOverlay} style={ghostBtn}>Cancel</button>
                      <button type="button" onClick={startRecording} style={primaryBtn}>Start</button>
                    </>
                  )}
                  {phase === 'recording' && (
                    <>
                      <button type="button" onClick={closeOverlay} style={ghostBtn}>Cancel</button>
                      <button type="button" onClick={stopRecording} style={stopBtn}>⏹ Stop</button>
                    </>
                  )}
                  {phase === 'preview' && (
                    <>
                      <button type="button" onClick={discard} style={ghostBtn}>Re-record</button>
                      <button type="button" onClick={send} style={primaryBtn}>Send</button>
                    </>
                  )}
                  {phase === 'sending' && (
                    <button type="button" disabled style={primaryBtn}>Sending…</button>
                  )}
                </div>

                {/* Inline preview audio so the user can listen back before sending. */}
                {phase === 'preview' && previewUrl && (
                  <audio
                    src={previewUrl}
                    controls
                    style={{ width: '100%', marginTop: 16, borderRadius: 12 }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DeniedPanel({ onClose }: { onClose: () => void }) {
  return (
    <>
      <h3 style={panelTitle}>Microphone blocked</h3>
      <p style={{ color: '#6b5744', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
        Your browser denied microphone access. To send voice notes, allow
        microphone permission for this site in your browser settings, then
        try again.
      </p>
      <div style={btnRow}>
        <button type="button" onClick={onClose} style={primaryBtn}>Close</button>
      </div>
    </>
  );
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function staticPeaks(elapsed: number): number[] {
  // Static gentle waveform shown when not recording — purely visual.
  const out: number[] = [];
  for (let i = 0; i < MAX_BARS; i++) {
    out.push(0.15 + Math.sin((i + elapsed) * 0.4) * 0.18 + 0.18);
  }
  return out;
}

const micButton: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '1px solid rgba(200,149,108,0.35)',
  background: 'white',
  color: '#c8956c',
  fontSize: 20,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
  flexShrink: 0,
};
const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1300,
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 18,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
};
const panel: React.CSSProperties = {
  width: '100%',
  maxWidth: 380,
  background: 'linear-gradient(180deg, #fff8ec 0%, #fff3ec 100%)',
  borderRadius: 22,
  padding: 22,
  boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
};
const panelTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: '#1a1208',
  margin: '0 0 14px',
};
const waveformRow: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  alignItems: 'center',
  justifyContent: 'center',
  height: 70,
  padding: 8,
  background: 'white',
  border: '1px solid rgba(200,149,108,0.25)',
  borderRadius: 14,
  marginBottom: 8,
};
const elapsedLabel: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 700,
  color: '#6b5744',
  marginBottom: 14,
};
const btnRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  justifyContent: 'center',
};
const ghostBtn: React.CSSProperties = {
  padding: '10px 18px',
  background: 'transparent',
  border: '1px solid rgba(200,149,108,0.4)',
  borderRadius: 100,
  color: '#8a7560',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const primaryBtn: React.CSSProperties = {
  padding: '10px 22px',
  background: '#c8956c',
  border: 'none',
  borderRadius: 100,
  color: 'white',
  fontSize: 14,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 8px 22px rgba(200,149,108,0.36)',
};
const stopBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#ff5a5a',
  boxShadow: '0 8px 22px rgba(255,90,90,0.4)',
};
