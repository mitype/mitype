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
}

/** Returns a CSSProperties object you can spread into a button/Link
 *  style. The caller supplies padding, font-size, color, and any
 *  layout properties — everything else (background, border, shadows,
 *  backdrop-filter) comes from this helper. */
export function liquidGlass(opts: Opts = {}): CSSProperties {
  const { tone = 'warm', hover = false, radius = 100 } = opts;

  // Body tint — the padding-box layer. Warm gets a warm cream tint,
  // clear gets a nearly-invisible white tint so it reads as clean glass.
  const body = tone === 'warm'
    ? 'linear-gradient(135deg, rgba(255,240,220,0.45) 0%, rgba(255,225,200,0.20) 50%, rgba(255,240,220,0.40) 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.35) 100%)';

  // Diagonal shine border — bright white at 0% (top-left corner) and
  // 100% (bottom-right corner), nearly transparent through the middle.
  // Warm variant tints the mid stops with bronze, clear leaves them neutral.
  const midTint = tone === 'warm'
    ? 'rgba(200,149,108,0.20)'
    : 'rgba(120,120,130,0.12)';
  const border =
    `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.15) 25%, ${midTint} 50%, rgba(255,255,255,0.15) 75%, rgba(255,255,255,0.95) 100%)`;

  // Outer soft shadow tuned per tone so warm CTAs "glow" bronze and
  // clear CTAs cast a neutral drop shadow.
  const outerGlow = tone === 'warm'
    ? (hover ? '0 12px 32px rgba(200,149,108,0.30)' : '0 6px 22px rgba(200,149,108,0.20)')
    : (hover ? '0 10px 28px rgba(0,0,0,0.14)'        : '0 4px 18px rgba(0,0,0,0.08)');

  return {
    position: 'relative',
    background: [
      `${body} padding-box`,
      `${border} border-box`,
    ].join(', '),
    border: '1.5px solid transparent',
    borderRadius: radius,
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    boxShadow: [
      // Inset top-left glow — mirrors the top-left shine on the border.
      'inset 2px 2px 6px rgba(255,255,255,0.35)',
      // Inset bottom-right shadow — mirrors the bottom-right curve.
      tone === 'warm'
        ? 'inset -2px -2px 6px rgba(120,80,40,0.10)'
        : 'inset -2px -2px 6px rgba(40,40,50,0.10)',
      outerGlow,
    ].join(', '),
    transform: hover ? 'translateY(-1px) scale(1.02)' : 'none',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    textShadow: '0 1px 0 rgba(255,255,255,0.5)',
  };
}
