// Shared "Liquid Glass" style helpers — Apple iOS 26 style.
//
// The signature look: a translucent glass body with a bright specular
// highlight at the top-left corner AND a mirrored highlight at the
// bottom-right corner, achieved with a 135° gradient border. Inset
// shadows mirror the light direction to sell the curved-glass feel.
//
// Use this helper to keep every glass surface visually consistent —
// tuning any of these knobs in one place propagates everywhere.
//
// Two tones:
//   'warm'  — bronze-tinted glass. Use for primary CTAs (Join now,
//             Create a profile, Start your free month, etc.).
//   'clear' — neutral clear glass. Use for secondary actions (Sign In,
//             filter chips, quiet toggles).

import type { CSSProperties } from 'react';

type Tone = 'warm' | 'clear';

interface Opts {
  /** Warm (bronze-tint) or clear (neutral) glass. Default 'warm'. */
  tone?: Tone;
  /** Hover state — deepens the outer glow and lifts the pill 1px. */
  hover?: boolean;
  /** Border radius. Default 100 (fully rounded pill). */
  radius?: number;
  /** 'full'  = real glass with backdrop-filter blur. Beautiful but
   *           GPU-intensive — use only on a handful of primary CTAs.
   *  'lite'  = same gradient border + inset shadows + inline tint,
   *           but NO backdrop-filter. Zero scroll cost. Use on
   *           high-count elements (category tiles, feature grids,
   *           anything repeated more than ~10 times on a page).
   *  Default 'full'. */
  variant?: 'full' | 'lite';
}

/** Returns a CSSProperties object you can spread into a button/Link
 *  style. The caller supplies padding, font-size, color, and any
 *  layout properties — everything else (background, border, shadows,
 *  backdrop-filter) comes from this helper. */
export function liquidGlass(opts: Opts = {}): CSSProperties {
  const { tone = 'warm', hover = false, radius = 100, variant = 'full' } = opts;

  // Body tint — the padding-box layer. In 'lite' mode we crank the
  // opacity up so the tile still reads as a distinct glass-like
  // surface without needing an expensive backdrop-filter blur.
  // Every color below reads a --lg-* variable and falls back to the
  // original value, so the normal look is unchanged. The new "Signal"
  // theme (globals.css) overrides the variables to get dark glass.
  const body = variant === 'lite'
    ? (tone === 'warm'
        ? 'var(--lg-body-lite-warm, linear-gradient(135deg, rgba(255,244,228,0.92) 0%, rgba(255,232,208,0.86) 50%, rgba(255,244,228,0.90) 100%))'
        : 'var(--lg-body-lite-clear, linear-gradient(135deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.78) 50%, rgba(255,255,255,0.88) 100%))')
    : (tone === 'warm'
        ? 'var(--lg-body-full-warm, linear-gradient(135deg, rgba(255,240,220,0.45) 0%, rgba(255,225,200,0.20) 50%, rgba(255,240,220,0.40) 100%))'
        : 'var(--lg-body-full-clear, linear-gradient(135deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.35) 100%))');

  // Diagonal shine border — bright at 0% (top-left corner) and 100%
  // (bottom-right corner), nearly transparent through the middle.
  const midTint = tone === 'warm'
    ? 'var(--lg-mid-warm, rgba(200,149,108,0.20))'
    : 'var(--lg-mid-clear, rgba(120,120,130,0.12))';
  const border =
    `linear-gradient(135deg, var(--lg-shine, rgba(255,255,255,0.95)) 0%, var(--lg-shine-soft, rgba(255,255,255,0.15)) 25%, ${midTint} 50%, var(--lg-shine-soft, rgba(255,255,255,0.15)) 75%, var(--lg-shine, rgba(255,255,255,0.95)) 100%)`;

  // Outer soft shadow tuned per tone so warm CTAs "glow" bronze and
  // clear CTAs cast a neutral drop shadow.
  const outerGlow = tone === 'warm'
    ? (hover ? 'var(--lg-glow-warm-hover, 0 12px 32px rgba(200,149,108,0.30))' : 'var(--lg-glow-warm, 0 6px 22px rgba(200,149,108,0.20))')
    : (hover ? 'var(--lg-glow-clear-hover, 0 10px 28px rgba(0,0,0,0.14))'        : 'var(--lg-glow-clear, 0 4px 18px rgba(0,0,0,0.08))');

  const base: CSSProperties = {
    position: 'relative',
    background: [
      `${body} padding-box`,
      `${border} border-box`,
    ].join(', '),
    border: '1.5px solid transparent',
    borderRadius: radius,
    boxShadow: [
      // Inset top-left glow — mirrors the top-left shine on the border.
      'var(--lg-inset-hi, inset 2px 2px 6px rgba(255,255,255,0.35))',
      // Inset bottom-right shadow — mirrors the bottom-right curve.
      tone === 'warm'
        ? 'var(--lg-inset-lo-warm, inset -2px -2px 6px rgba(120,80,40,0.10))'
        : 'var(--lg-inset-lo-clear, inset -2px -2px 6px rgba(40,40,50,0.10))',
      outerGlow,
    ].join(', '),
    transform: hover ? 'translateY(-1px) scale(1.02)' : 'none',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    textShadow: 'var(--lg-text-shadow, 0 1px 0 rgba(255,255,255,0.5))',
  };

  // Full variant adds the expensive backdrop-filter for true glass;
  // lite variant leaves it off entirely for scroll performance.
  if (variant === 'full') {
    base.backdropFilter = 'blur(16px) saturate(180%)';
    (base as any).WebkitBackdropFilter = 'blur(16px) saturate(180%)';
  }

  return base;
}
