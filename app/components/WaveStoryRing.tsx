'use client';
// Bronze gradient "story ring" around a child avatar. Indicates that
// the wrapped creator has posted a Wave video in the last 24 hours.
//
// When `active` is true and the component is given a creatorUserId,
// the ring becomes a tap target that opens the Wave feed scoped to
// that creator (`/wave?user=<id>`). When inactive, the children are
// rendered unchanged with no link wrapper.

import Link from 'next/link';

interface Props {
  active: boolean;
  creatorUserId?: string;
  /** Diameter of the avatar circle the ring wraps, in px. */
  size: number;
  /** Optional thickness of the ring; defaults to ~6% of size. */
  ringWidth?: number;
  children: React.ReactNode;
  /** Override the ring color stops if you want something custom. */
  gradient?: string;
}

const DEFAULT_GRADIENT =
  'linear-gradient(135deg, #c8956c 0%, #ffb37c 50%, #c8956c 100%)';

export function WaveStoryRing({
  active,
  creatorUserId,
  size,
  ringWidth,
  children,
  gradient = DEFAULT_GRADIENT,
}: Props) {
  if (!active) return <>{children}</>;

  const w = ringWidth ?? Math.max(2, Math.round(size * 0.06));
  const outer = size + w * 2 + 4; // ring + small gap before avatar
  const ring = (
    <div
      style={{
        width: outer,
        height: outer,
        borderRadius: '50%',
        background: gradient,
        padding: w,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size + 4,
          height: size + 4,
          borderRadius: '50%',
          background: 'white',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f0e8df',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  if (creatorUserId) {
    return (
      <Link
        href={`/wave?user=${encodeURIComponent(creatorUserId)}`}
        aria-label="Watch this creator's Wave videos"
        style={{ textDecoration: 'none', display: 'inline-flex' }}
      >
        {ring}
      </Link>
    );
  }

  return ring;
}
