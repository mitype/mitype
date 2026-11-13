// Profile banner helpers. A banner is stored in profiles.banner_url as:
//   lib:<id>          preloaded library banner (public/banners/<w>/<id>.webp)
//   up:<uid>/<stamp>  member upload (storage bucket "banners",
//                     <uid>/<stamp>-<w>.webp for w in BANNER_WIDTHS)
// Every banner exists at three widths so phones, tablets and desktops each
// load the sharpest file they need and nothing is ever stretched.

import { supabase } from './supabaseClient';
import { BANNER_LIBRARY } from './bannerLibrary';

export const BANNER_WIDTHS = [2400, 1600, 800] as const;
/** Every banner is stored 21:9; the profile card crops it from the center. */
export const BANNER_RATIO = 21 / 9;

export type BannerSources = { src: string; srcSet: string };

export function bannerSources(value: string | null | undefined): BannerSources | null {
  if (!value) return null;
  if (value.startsWith('lib:')) {
    const id = value.slice(4);
    if (!BANNER_LIBRARY.some((b) => b.id === id)) return null;
    return {
      src: `/banners/1600/${id}.webp`,
      srcSet: BANNER_WIDTHS.map((w) => `/banners/${w}/${id}.webp ${w}w`).join(', '),
    };
  }
  if (value.startsWith('up:')) {
    const base = value.slice(3);
    const url = (w: number) =>
      supabase.storage.from('banners').getPublicUrl(`${base}-${w}.webp`).data.publicUrl;
    return {
      src: url(1600),
      srcSet: BANNER_WIDTHS.map((w) => `${url(w)} ${w}w`).join(', '),
    };
  }
  return null;
}

/** Best-effort cleanup of a member's previous upload. */
export async function deleteUploadedBanner(value: string | null | undefined) {
  if (!value || !value.startsWith('up:')) return;
  const base = value.slice(3);
  try {
    await supabase.storage.from('banners').remove(BANNER_WIDTHS.map((w) => `${base}-${w}.webp`));
  } catch {
    /* ignore */
  }
}

/**
 * Smooth fade-out mask (smoothstep curve): opaque at the top, fully
 * transparent at the bottom. Applied to the photo itself so whatever color
 * the card is (light or dark theme) shows through and "fades into" the photo.
 */
export function bannerMask(): string {
  const start = 0.3; // fade begins 30% down the banner
  const n = 14;
  const stops: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = t * t * (3 - 2 * t);
    stops.push(`rgba(0,0,0,${(1 - s).toFixed(3)}) ${((start + t * (1 - start)) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(to bottom, rgba(0,0,0,1) 0%, ${stops.join(', ')})`;
}
