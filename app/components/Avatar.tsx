'use client';
// Reusable avatar that wraps next/image. Falls back to a 👤 placeholder
// when there's no URL or when the image errors (common during trial when
// the user hasn't uploaded one yet).
//
// Supabase avatar URLs have the form
//   https://<project>.supabase.co/storage/v1/object/public/avatars/<user>/avatar.<ext>[?v=<version>]
// which is allow-listed in next.config.ts so next/image can optimize them.

import Image from 'next/image';
import { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  alt: string;
  /** Rendered pixel size (square or rectangle). */
  width: number;
  height?: number;
  /** Emoji used as the fallback. */
  placeholder?: string;
  /** Font-size for the fallback emoji. */
  fallbackFontSize?: number;
  /** `sizes` hint so the browser picks the right srcset entry. */
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Avatar({
  src,
  alt,
  width,
  height,
  placeholder = '👤',
  fallbackFontSize,
  sizes,
  className,
  style,
}: AvatarProps) {
  const h = height ?? width;
  const [errored, setErrored] = useState(false);

  // If there's no src or it fell back on error, render the emoji placeholder.
  if (!src || errored) {
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: fallbackFontSize ?? Math.round(Math.min(width, h) * 0.5),
          ...style,
        }}
      >
        {placeholder}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={h}
      sizes={sizes}
      onError={() => setErrored(true)}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );
}
