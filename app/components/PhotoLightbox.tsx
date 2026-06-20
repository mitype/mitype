'use client';
// Inline photo bubble + tap-to-zoom fullscreen viewer for chat
// attachments. The thumbnail caps at 240px wide so chat layout stays
// tidy; the modal shows the photo full-bleed with a close button and
// a tap-outside-to-dismiss zone.

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  url: string;
  expiresAt?: string | null;
}

export function PhotoLightbox({ url, expiresAt }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Defer portal mount to client only.
  if (typeof window !== 'undefined' && !mounted) {
    queueMicrotask(() => setMounted(true));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View photo"
        style={{
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 16,
          overflow: 'hidden',
          maxWidth: 240,
          position: 'relative',
          display: 'inline-block',
          lineHeight: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Shared photo"
          style={{
            display: 'block',
            maxWidth: 240,
            maxHeight: 320,
            width: 'auto',
            height: 'auto',
            borderRadius: 16,
          }}
        />
        {expiresAt && (
          <ExpiryBadge expiresAt={expiresAt} />
        )}
      </button>

      {open && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          data-no-swipe-back="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.94)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Shared photo"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: 12,
              boxShadow: '0 16px 60px rgba(0,0,0,0.5)',
            }}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 'max(16px, env(safe-area-inset-top))',
              right: 16,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: 20,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const label = hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
  return (
    <span style={{
      position: 'absolute',
      bottom: 8,
      right: 8,
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      fontSize: 10,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 100,
      pointerEvents: 'none',
      letterSpacing: 0.3,
    }}>
      ⏱ {label}
    </span>
  );
}
