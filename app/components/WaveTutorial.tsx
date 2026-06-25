'use client';
// First-time tutorial for The Wave. Shown once per user — gated by
// the `wave_tutorial_seen` flag on the profile. Five swipeable slides
// covering: scroll, compatibility score, like, message, dismiss,
// 24-hour expiry, and how to post.

import { useState } from 'react';

interface Props {
  onDismiss: () => Promise<void> | void;
}

const SLIDES: Array<{ title: string; body: string; icon: string }> = [
  {
    title: 'Welcome to The Wave',
    body: "Swipe up to see what creators are sharing right now. Every video disappears after 24 hours. So what you see is fresh.",
    icon: '🌊',
  },
  {
    title: 'See your compatibility',
    body: "Each video shows how much you and the creator have in common, based on shared crafts and categories. Higher score = your kind of person.",
    icon: '🎯',
  },
  {
    title: 'Like, message, or skip',
    body: 'Tap the heart to like. Tap the message bubble to start a private conversation. Tap the X to dismiss. That creator won\'t show in your feed again.',
    icon: '💬',
  },
  {
    title: 'Your inbox, your rules',
    body: 'Every message request needs your approval before a conversation opens. Nothing watched. Nothing sold. Just real connection.',
    icon: '🔒',
  },
  {
    title: 'Post your own',
    body: "Tap the camera icon at the top to post a video of your craft. Anything under 60 seconds. You can post up to 3 videos every 24 hours.",
    icon: '📹',
  },
];

export function WaveTutorial({ onDismiss }: Props) {
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
      aria-label="The Wave tutorial"
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
          position: 'relative',
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

        {/* Slide dots */}
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

        {/* Buttons */}
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
            {isLast ? "Let's go" : 'Next'}
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
