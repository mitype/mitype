'use client';
// Inline voice-note player rendered inside a chat bubble.
// Renders a circular play/pause button, a thin progress bar, and a
// "00:00 / 00:14" duration label. Uses a single <audio> element under
// the hood for cross-browser compatibility.

import { useEffect, useRef, useState } from 'react';

interface Props {
  url: string;
  durationSeconds: number;
  /** Tints to match the bubble (sender vs receiver). */
  variant?: 'mine' | 'theirs';
}

export function VoiceNotePlayer({ url, durationSeconds, variant = 'theirs' }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setPos(a.currentTime);
    const onEnd = () => { setPlaying(false); setPos(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  const isMine = variant === 'mine';
  const accent = isMine ? 'rgba(255,255,255,0.95)' : '#c8956c';
  const trackBg = isMine ? 'rgba(255,255,255,0.25)' : 'rgba(200,149,108,0.18)';
  const labelColor = isMine ? 'rgba(255,255,255,0.85)' : '#7a6753';

  const progressPct = durationSeconds > 0
    ? Math.min(100, (pos / durationSeconds) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play voice note'}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: 'none',
          background: isMine ? 'rgba(255,255,255,0.18)' : 'white',
          color: accent,
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isMine ? 'none' : '0 2px 6px rgba(200,149,108,0.25)',
          fontFamily: 'inherit',
        }}
      >
        {playing ? '⏸' : '▶'}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          height: 4,
          background: trackBg,
          borderRadius: 100,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            background: accent,
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: labelColor,
          marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmt(pos)} / {fmt(durationSeconds)}
        </div>
      </div>

      <audio ref={audioRef} src={url} preload="metadata" />
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
