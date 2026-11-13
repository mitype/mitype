'use client';
// Banner at the top of a profile card. The photo is cropped from the center
// (object-fit: cover) and the card color fades smoothly over its lower part.

import { bannerSources, bannerFadeGradient } from '../lib/banners';

export function ProfileBanner({
  value,
  fadeTo = '#ffffff',
  radius = 32,
  height = 'clamp(180px, 50vw, 240px)',
}: {
  value: string | null | undefined;
  fadeTo?: string;
  radius?: number;
  height?: string;
}) {
  const s = bannerSources(value);
  if (!s) return null;
  return (
    <div
      style={{
        position: 'relative',
        height,
        overflow: 'hidden',
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        background: fadeTo,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={s.src}
        srcSet={s.srcSet}
        sizes="(min-width: 700px) 680px, 100vw"
        alt=""
        decoding="async"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
      />
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: bannerFadeGradient(fadeTo), pointerEvents: 'none' }}
      />
    </div>
  );
}
