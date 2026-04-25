'use client';
// Profile photo gallery — horizontally scrollable strip on mobile,
// 2-column grid on wider screens. Click a photo to open a lightbox.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ProfilePhoto } from '../lib/photos';

interface PhotoGalleryProps {
  photos: ProfilePhoto[];
  altPrefix: string;
}

export function PhotoGallery({ photos, altPrefix }: PhotoGalleryProps) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActive(null);
      if (e.key === 'ArrowRight') setActive((i) => (i === null ? null : Math.min(i + 1, photos.length - 1)));
      if (e.key === 'ArrowLeft')  setActive((i) => (i === null ? null : Math.max(i - 1, 0)));
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [active, photos.length]);

  if (photos.length === 0) return null;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(200,149,108,0.2)',
        borderRadius: 24,
        padding: '24px',
        marginBottom: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#a89278',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 16,
        }}
      >
        Photos
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10,
        }}
      >
        {photos.map((p, i) => (
          <button
            key={`${p.url}-${i}`}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            style={{
              padding: 0,
              border: 'none',
              background: '#f0e8df',
              borderRadius: 14,
              overflow: 'hidden',
              aspectRatio: '3/4',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <Image
              src={p.url}
              alt={`${altPrefix} photo ${i + 1}`}
              fill
              sizes="(max-width: 700px) 50vw, 200px"
              style={{ objectFit: 'cover' }}
            />
          </button>
        ))}
      </div>

      {active !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${active + 1} of ${photos.length}`}
          onClick={() => setActive(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 20,
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setActive(null); }}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.18)',
              color: 'white',
              fontSize: 22,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>

          {active > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActive(active - 1); }}
              aria-label="Previous photo"
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.18)',
                color: 'white',
                fontSize: 22,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ‹
            </button>
          )}

          {active < photos.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActive(active + 1); }}
              aria-label="Next photo"
              style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.18)',
                color: 'white',
                fontSize: 22,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ›
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 720,
              aspectRatio: '3/4',
              maxHeight: '90vh',
            }}
          >
            <Image
              src={photos[active].url}
              alt={`${altPrefix} photo ${active + 1}`}
              fill
              sizes="(max-width: 720px) 100vw, 720px"
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
