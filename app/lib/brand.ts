// Mitype brand color system.
//
// Three brand families:
//   - personal (bronze)  — creator-facing surfaces: profile, Wave, Discover,
//                          messages, dashboard, daily spark, prompts, games.
//   - business (purple)  — small business / commerce surfaces: business
//                          profile, business recommendations, /businesses,
//                          edit-business-profile, business spotlight.
//   - market   (green)   — Mi Home Goods marketplace: /home-goods, listing
//                          detail, sell flow, safety modal, by/[username].
//
// Plus shared neutrals (text + canvas), a danger family for soft red
// destructive UI, and overlay tints for modals/scrims.
//
// USAGE
//
//   // From TS:
//   import { brand } from '@/lib/brand';
//   <div style={{ background: brand.personal.primary }} />
//   <div style={{ borderColor: brand.market.tint(0.4) }} />
//   <div style={{ background: brand.business.gradient }} />
//
//   // From style strings (no import needed):
//   <div style={{ background: 'var(--brand-personal)' }} />
//
// Every constant below is mirrored to a CSS custom property in
// app/globals.css. Adding a new token? Add it both places. The TS export
// is the source of truth for autocomplete; the CSS vars are used for the
// bulk of the codebase that was migrated via a textual sweep.

/** Build an rgba() string from a comma-separated "r,g,b" channel triple. */
function rgba(rgb: string, alpha: number): string {
  return `rgba(${rgb},${alpha})`;
}

// --- channels (used by tint() helpers) ----------------------------------
const PERSONAL_RGB = '200,149,108';
const BUSINESS_RGB = '139,92,246';
const MARKET_RGB   = '21,128,61';
const DANGER_RGB   = '220,100,100';
const BLACK_RGB    = '0,0,0';
const WHITE_RGB    = '255,255,255';

// --- families -----------------------------------------------------------

export const brand = {
  /** Bronze family. Used for personal/creator surfaces. */
  personal: {
    primary:      '#c8956c',
    primaryLight: '#ffb37c',
    primaryDeep:  '#a07a4d',
    primarySoft:  '#ffd5a8',
    disabled:     '#d4a882',

    text: {
      dark:    '#1a1208',
      head:    '#6b5744',
      mid:     '#8a7560',
      light:   '#a89278',
      lighter: '#b0967e',
      deep:    '#5b4a36',
      amber:   '#7a6a4f',
    },

    bg: {
      cream:     '#faf6f0',
      creamDeep: '#f5f0e8',
      peach:     '#fff3ec',
      peachWarm: '#fff8ec',
      pale:      '#f0e8df',
    },

    /** rgba(200,149,108, alpha). */
    tint: (alpha: number) => rgba(PERSONAL_RGB, alpha),

    gradient:    'linear-gradient(135deg, #c8956c 0%, #ffb37c 100%)',
    glow:        '0 8px 22px rgba(200,149,108,0.3)',
    glowSoft:    '0 4px 14px rgba(200,149,108,0.15)',
  },

  /** Purple family. Used for business / commerce surfaces. */
  business: {
    primary:        '#8b5cf6',
    primaryLight:   '#c084fc',
    primaryDeep:    '#5b21b6',
    primaryDeepest: '#2e1065',

    text: {
      mid: '#7a6a85',
    },

    bg: {
      pale:     '#faf6ff',
      lavender: '#f4ebff',
    },

    /** rgba(139,92,246, alpha). */
    tint: (alpha: number) => rgba(BUSINESS_RGB, alpha),

    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
    glow:     '0 8px 22px rgba(139,92,246,0.35)',
    glowSoft: '0 4px 14px rgba(139,92,246,0.15)',
  },

  /** Green family. Used for Mi Home Goods marketplace. */
  market: {
    primary:      '#15803d',
    primaryLight: '#22c55e',
    primaryDeep:  '#0f3a23',
    success:      '#16a34a',

    text: {
      mid: '#3a5d48',
    },

    bg: {
      pale: '#f7fdf9',
      mint: '#ecfdf5',
    },

    /** rgba(21,128,61, alpha). */
    tint: (alpha: number) => rgba(MARKET_RGB, alpha),

    gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
    glow:     '0 8px 22px rgba(21,128,61,0.18)',
    glowSoft: '0 4px 14px rgba(21,128,61,0.08)',
  },

  /** Soft red. Used for block / report / delete / destructive UI. */
  danger: {
    text:   '#c07070',
    bg:     '#fff0f0',
    tint:   (alpha: number) => rgba(DANGER_RGB, alpha),
    border: 'rgba(220,100,100,0.3)',
  },

  /** Universal text + canvas neutrals. */
  text: {
    primary: '#1a1208',
  },

  /** Canvas / surface backgrounds. */
  surface: {
    white: '#ffffff',
    glass: 'rgba(255,255,255,0.85)',
  },

  /** Black/white scrims + glassy overlays for modals. */
  overlay: {
    dim:     'rgba(0,0,0,0.4)',
    deeper:  'rgba(0,0,0,0.55)',
    soft:    'rgba(0,0,0,0.06)',
    white:   (alpha: number) => rgba(WHITE_RGB, alpha),
    black:   (alpha: number) => rgba(BLACK_RGB, alpha),
  },
} as const;

/** Convenience namespaces for terse imports. */
export const personal = brand.personal;
export const business = brand.business;
export const market   = brand.market;
export const danger   = brand.danger;

export type Brand = typeof brand;
