'use client';
// Banner at the top of a profile card. The photo is cropped from the center
// (object-fit: cover) and fades out smoothly into the card's own color.

import { bannerSources, bannerMask } from '../lib/banners';

export function ProfileBanner({
  value,
  radius = 32,
  height = 'clamp(180px, 50vw, 240px)',
}: {
  value: string | null | undefined;
  radius?: number;
  height?: string;
}) {
  const s = bannerSources(value);
  if (!s) return null;
  const mask = bannerMask();
  return (
    <div
      style={{
        position: 'relative',
        height,
        overflow: 'hidden',
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={s.src}
        srcSet={s.srcSet}
        sizes="(min-width: 700px) 680px, 100vw"
        alt=""
        decoding="async"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          WebkitMaskImage: mask, maskImage: mask,
        }}
      />
    </div>
  );
}
