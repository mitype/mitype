'use client';
// One-time tutorial for the Wave video editor. Shown only on the
// user's first visit to /wave/create — gated by the
// `wave_editor_tutorial_seen` flag on the profile.

import { useState } from 'react';

interface Props {
  onDismiss: () => Promise<void> | void;
}

const SLIDES: Array<{ title: string; body: string; icon: string }> = [
  {
    title: 'Edit before you post',
    body: 'Mitype now has a built-in video editor. Trim your clip, pick a vibe, add a caption. All in one screen, all before anything goes live.',
    icon: '✨',
  },
  {
    title: 'Trim',
    body: "Slide the two handles to set where your video starts and ends. Cut out the boring parts. Make every second count.",
    icon: '✂️',
  },
  {
    title: 'Pick a vibe',
    body: 'Tap through the filters. Warm Cinema, Moody, Black & White, Sepia, Cool Tone, Faded Film. Preview is live; pick the one that fits your moment.',
    icon: '🎨',
  },
  {
    title: 'Add a caption',
    body: 'Drop a short line of text on the video. Shows up in a clean pill at the bottom. Optional. But a great hook.',
    icon: '💬',
  },
  {
    title: 'Watermarked + downloadable',
    body: 'Every video automatically gets a small Mitype watermark in the corner. Hit Save on any Wave video to download it to your device and share it anywhere.',
    icon: '💧',
  },
];

export function WaveEditorTutorial({ onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  const [closing, setClosing] = useState(false);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  async function handleDone() {
    setClosing(true);
    await onDismiss();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wave editor tutorial"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,18,8,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        opacity: closing ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #fff8ec 0%, #fff3ec 100%)',
          borderRadius: 28,
          maxWidth: 440,
          width: '100%',
          padding: '40px 32px 28px',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>{slide.icon}</div>
        <h2
          style={{
            color: '#1a1208',
            fontSize: 24,
            fontWeight: 800,
            margin: '0 0 14px',
            letterSpacing: '-0.5px',
          }}
        >
          {slide.title}
        </h2>
        <p
          style={{
            color: '#6b5744',
            fontSize: 16,
            lineHeight: 1.6,
            margin: '0 0 28px',
          }}
        >
          {slide.body}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          {SLIDES.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === index ? 28 : 8,
                height: 8,
                borderRadius: 100,
                background: i === index ? '#c8956c' : 'rgba(200,149,108,0.35)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              style={{
                flex: 1,
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(200,149,108,0.4)',
                borderRadius: 100,
                color: '#8a7560',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? handleDone : () => setIndex(index + 1)}
            style={{
              flex: 1,
              padding: '14px',
              background: '#c8956c',
              border: 'none',
              borderRadius: 100,
              color: 'white',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 8px 22px rgba(200,149,108,0.32)',
            }}
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>

        {!isLast && (
          <button
            type="button"
            onClick={handleDone}
            style={{
              marginTop: 14,
              background: 'transparent',
              border: 'none',
              color: '#a89278',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}
